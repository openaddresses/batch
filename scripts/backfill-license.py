#!/usr/bin/env python3
# /// script
# requires-python = ">=3.10"
# dependencies = [
#     "psycopg2-binary",
#     "requests",
# ]
# ///
"""Backfill job.license for jobs referenced by current results rows.

explode()/Run.populate() only started writing job.license going forward;
this backfills the ~5k jobs current `results` rows point at by re-reading
each job's source JSON and re-deriving the license the same way explode() does.

Prefers a local checkout of the openaddresses/openaddresses sources/
directory (via --sources-dir) over fetching each job's source URL, which is
pinned to the commit SHA in effect when that job was created and can 404 if
the source has since moved or the branch it references no longer exists.
Falls back to fetching source_url over HTTP for any source not found locally.

Usage:
  uv run scripts/backfill-license.py "postgresql://user:pass@host:5432/dbname" --sources-dir /path/to/addresses/sources
  uv run scripts/backfill-license.py "postgresql://..." --sources-dir /path/to/addresses/sources --dry-run
"""

import argparse
import json
import os
import sys

import psycopg2
import requests


def derive_license(source_json, layer, name):
    """Mirrors the merge logic in api/lib/util.js explode()."""
    layers = source_json.get('layers', {})
    for entry in layers.get(layer, []):
        if entry.get('name') == name:
            license_obj = entry.get('license')
            # Some sources use a bare string (a URL) or other non-dict value for
            # `license` - treat anything that isn't a dict as "no license".
            if not isinstance(license_obj, dict):
                return None
            return {**license_obj, 'website': entry.get('website')}
    return None


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument('db_uri', help='Postgres connection URI')
    parser.add_argument('--sources-dir', help='Local path to openaddresses/openaddresses sources/ directory')
    parser.add_argument('--dry-run', action='store_true', help='Show what would be updated without making changes')
    args = parser.parse_args()

    conn = psycopg2.connect(args.db_uri)
    cur = conn.cursor()

    cur.execute("""
        SELECT job.id, job.source, results.layer, results.name
        FROM results
        INNER JOIN job ON results.job = job.id
        WHERE job.license IS NULL OR lower(job.license) = 'false'
    """)
    rows = cur.fetchall()
    print(f"Found {len(rows)} current results with no license data", file=sys.stderr)

    cache = {}  # source_url -> parsed JSON or None
    updated = 0
    skipped = 0

    for i, (job_id, source_url, layer, name) in enumerate(rows):
        if i % 100 == 0 and i > 0:
            print(f"  Progress: {i}/{len(rows)}, {updated} updated", file=sys.stderr)
            if not args.dry_run:
                conn.commit()

        if source_url not in cache:
            source_json = None

            if args.sources_dir and '/sources/' in source_url:
                rel_path = source_url.split('/sources/', 1)[1]
                local_path = os.path.join(args.sources_dir, rel_path)
                if os.path.exists(local_path):
                    try:
                        with open(local_path) as f:
                            source_json = json.load(f)
                    except Exception as e:
                        print(f"  Warning: Failed to read {local_path}: {e}", file=sys.stderr)

            if source_json is None:
                try:
                    resp = requests.get(source_url, timeout=10)
                    resp.raise_for_status()
                    source_json = resp.json()
                except Exception as e:
                    print(f"  Warning: Failed to fetch {source_url}: {e}", file=sys.stderr)

            cache[source_url] = source_json

        source_json = cache[source_url]
        if source_json is None:
            skipped += 1
            continue

        try:
            license_data = derive_license(source_json, layer, name)
        except Exception as e:
            print(f"  Warning: Failed to derive license for job {job_id} ({source_url} {layer}/{name}): {e}", file=sys.stderr)
            skipped += 1
            continue

        if license_data is None:
            skipped += 1
            continue

        if args.dry_run:
            print(f"  Would update: job {job_id} -> {json.dumps(license_data)}", file=sys.stderr)
        else:
            try:
                cur.execute("UPDATE job SET license = %s WHERE id = %s", (json.dumps(license_data), job_id))
            except Exception as e:
                print(f"  Warning: Failed to update job {job_id}: {e}", file=sys.stderr)
                conn.rollback()
                skipped += 1
                continue
        updated += 1

    if not args.dry_run:
        conn.commit()

    print(f"\nDone: {updated} jobs updated, {skipped} skipped (no license or fetch failed)", file=sys.stderr)

    cur.close()
    conn.close()


if __name__ == '__main__':
    main()
