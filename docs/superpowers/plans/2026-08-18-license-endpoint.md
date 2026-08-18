# License Endpoint Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the broken static `licenses.json` the openaddresses.io attribution page depends on with a live `GET /api/licenses` endpoint on the `batch` API, sourced from license/website data already present in source JSON definitions.

**Architecture:** Source JSON already carries `license`/`website` per layer. `batch`'s job-creation code (`explode()`) already reads that per-layer object but drops `license`; two small changes make it flow through into the `job.license` DB column with no other pipeline involvement. A new read endpoint aggregates `results` → `job` into the same grouped shape the website already parses. A one-off backfill script populates `license` for jobs that predate this change. The website then points at the new endpoint instead of the dead R2 URL.

**Tech Stack:** Node.js/Express (`batch/api`), Postgres via `slonik`, `node:test` + `nock` for tests, Python (`psycopg2`) for the backfill script, static Jekyll site (`openaddresses.io`).

**Spec:** `/Users/iandees/SynologyDrive/Projects/OpenAddresses/batch/docs/superpowers/specs/2026-08-18-license-endpoint-design.md`

## Global Constraints

- No changes to `batch-machine` or the task runner's job-completion reporting — license is populated at job-creation time only.
- No change to `req.body.PatchJob.json` — the completion PATCH path is untouched.
- Tests requiring the DB use the existing `Flight` harness (`api/test/flight.js`), which expects a local Postgres at `postgres://postgres@localhost:5432/openaddresses_test` (existing repo convention, already required by all `*.srv.test.js`/DB-backed `*.unit.test.js` files).
- All new tests use `nock` to mock GitHub source fetches — no live network calls, for determinism (matches the existing `api/test/map.unit.test.js` convention).

---

### Task 1: Merge `license`/`website` into job specs in `explode()`

**Files:**
- Modify: `api/lib/util.js:25-53` (the `explode()` function)
- Test: `api/test/util.unit.test.js` (create)

**Interfaces:**
- Produces: `explode(url)` now returns job spec objects shaped `{ source, layer, name, license }`, where `license` is `undefined` when the layer has no `license` field, or `{ ...layerLicenseObject, website: layerWebsiteOrUndefined }` otherwise. Task 2 consumes this `license` field.

- [ ] **Step 1: Write the failing test**

Create `api/test/util.unit.test.js`:

```js
import { explode } from '../lib/util.js';
import test from 'node:test';
import assert from 'assert';
import nock from 'nock';

test('explode() merges layer license + website into the job spec', async () => {
    nock.disableNetConnect();

    const url = 'https://raw.githubusercontent.com/openaddresses/openaddresses/testsha1/sources/ca/mb/brandon.json';

    nock('https://raw.githubusercontent.com')
        .get('/openaddresses/openaddresses/testsha1/sources/ca/mb/brandon.json')
        .reply(200, {
            schema: 2,
            coverage: { country: 'ca' },
            layers: {
                addresses: [{
                    name: 'city',
                    website: 'https://opengov.brandon.ca/OpenDataService/opendata.html',
                    license: {
                        url: 'https://opendata.brandon.ca/terms.aspx',
                        'attribution name': 'City of Brandon',
                        text: 'Contains public sector Datasets made available under the City of Brandon\'s Open Data Licence'
                    }
                }]
            }
        });

    const jobs = await explode(url);

    assert.deepEqual(jobs, [{
        source: url,
        layer: 'addresses',
        name: 'city',
        license: {
            url: 'https://opendata.brandon.ca/terms.aspx',
            'attribution name': 'City of Brandon',
            text: 'Contains public sector Datasets made available under the City of Brandon\'s Open Data Licence',
            website: 'https://opengov.brandon.ca/OpenDataService/opendata.html'
        }
    }], 'job spec includes merged license + website');

    nock.cleanAll();
    nock.enableNetConnect();
});

test('explode() sets license to undefined when the layer has none', async () => {
    nock.disableNetConnect();

    const url = 'https://raw.githubusercontent.com/openaddresses/openaddresses/testsha2/sources/us/xx/nolicense.json';

    nock('https://raw.githubusercontent.com')
        .get('/openaddresses/openaddresses/testsha2/sources/us/xx/nolicense.json')
        .reply(200, {
            schema: 2,
            coverage: { country: 'us' },
            layers: {
                addresses: [{ name: 'city' }]
            }
        });

    const jobs = await explode(url);

    assert.deepEqual(jobs, [{
        source: url,
        layer: 'addresses',
        name: 'city',
        license: undefined
    }], 'job spec has no license');

    nock.cleanAll();
    nock.enableNetConnect();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node api/test/util.unit.test.js`
Expected: FAIL — actual `jobs` will not include a `license` key at all (current `explode()` only pushes `source`/`layer`/`name`).

- [ ] **Step 3: Write minimal implementation**

In `api/lib/util.js`, change the `jobs.push` inside `explode()`:

```js
    const layers = Object.keys(source.layers);
    for (const layer of layers) {
        for (const j of source.layers[layer]) {
            jobs.push({
                source: url,
                layer: layer,
                name: j.name,
                license: j.license ? { ...j.license, website: j.website } : undefined
            });
        }
    }
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node api/test/util.unit.test.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
cd /Users/iandees/SynologyDrive/Projects/OpenAddresses/batch
git add api/lib/util.js api/test/util.unit.test.js
git commit -m "merge layer license and website into explode() job specs"
```

---

### Task 2: Pass `license` through `Run.populate()` into the DB

**Files:**
- Modify: `api/lib/types/run.js:226-231`
- Test: `api/test/job-license.srv.test.js` (create)

**Interfaces:**
- Consumes: `explode()` job specs from Task 1, specifically the `license` field.
- Produces: `Job` rows created via `Run.populate()` now have `license` set in the DB, readable via `GET /api/job/:job` as `res.body.license` (parsed object, per `Job.serialize()` at `api/lib/types/job.js:318-327`, unchanged). Task 3 depends on this column being populated.

- [ ] **Step 1: Write the failing test**

Create `api/test/job-license.srv.test.js`:

```js
import test from 'node:test';
import assert from 'assert';
import Flight from './flight.js';
import nock from 'nock';

const flight = new Flight();
flight.init();
flight.takeoff();

test('nocks', () => {
    nock.disableNetConnect();

    nock('https://raw.githubusercontent.com')
        .persist()
        .get('/openaddresses/openaddresses/testsha1/sources/ca/mb/brandon.json')
        .reply(200, {
            schema: 2,
            coverage: { country: 'ca' },
            layers: {
                addresses: [{
                    name: 'city',
                    website: 'https://opengov.brandon.ca/OpenDataService/opendata.html',
                    license: {
                        url: 'https://opendata.brandon.ca/terms.aspx',
                        'attribution name': 'City of Brandon',
                        text: 'Contains public sector Datasets made available under the City of Brandon\'s Open Data Licence'
                    }
                }]
            }
        });
});

test('POST /api/run', async () => {
    try {
        const res = await flight.fetch('/api/run', {
            method: 'POST',
            headers: { 'shared-secret': '123' },
            body: { live: true }
        }, true);

        assert.equal(res.body.id, 1, 'run.id: 1');
    } catch (err) {
        assert.ifError(err, 'no error');
    }
});

test('POST /api/run/1/jobs populates job.license', async () => {
    try {
        const res = await flight.fetch('/api/run/1/jobs', {
            method: 'POST',
            headers: { 'shared-secret': '123' },
            body: {
                jobs: ['https://raw.githubusercontent.com/openaddresses/openaddresses/testsha1/sources/ca/mb/brandon.json']
            }
        }, true);

        assert.deepEqual(res.body, { run: 1, jobs: [1] }, 'Run 1 populated with job 1');
    } catch (err) {
        assert.ifError(err, 'no error');
    }
});

test('GET /api/job/1 returns the populated license', async () => {
    try {
        const res = await flight.fetch('/api/job/1', {
            method: 'GET',
            headers: { 'shared-secret': '123' }
        }, true);

        assert.deepEqual(res.body.license, {
            url: 'https://opendata.brandon.ca/terms.aspx',
            'attribution name': 'City of Brandon',
            text: 'Contains public sector Datasets made available under the City of Brandon\'s Open Data Licence',
            website: 'https://opengov.brandon.ca/OpenDataService/opendata.html'
        }, 'job.license: <merged license + website>');
    } catch (err) {
        assert.ifError(err, 'no error');
    }
});

test('cleanup', () => {
    nock.cleanAll();
    nock.enableNetConnect();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node api/test/job-license.srv.test.js`
Expected: FAIL on the `GET /api/job/1` assertion — `res.body.license` will be `true` (the current default-parse-failure fallback in `Job.serialize()`), not the merged object, because `Run.populate()` drops the `license` field from the job spec before calling `Job.generate()`.

- [ ] **Step 3: Write minimal implementation**

In `api/lib/types/run.js`, update the `Job.generate()` call at line 226:

```js
                jobs[i] = await Job.generate(pool, {
                    run: run_id,
                    source: jobs[i].source,
                    layer: jobs[i].layer,
                    name: jobs[i].name,
                    license: jobs[i].license
                });
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node api/test/job-license.srv.test.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add api/lib/types/run.js api/test/job-license.srv.test.js
git commit -m "pass merged license through Run.populate() into job.generate()"
```

---

### Task 3: New `GET /api/licenses` endpoint

**Files:**
- Create: `api/lib/types/license.js`
- Create: `api/routes/license.js`
- Create: `api/schema/res.Licenses.json`
- Test: `api/test/license.srv.test.js` (create)

**Interfaces:**
- Consumes: `job.license` populated via Task 2, `results` rows (created by `Data.update()` on job success — see `api/lib/types/data.js:313-328` and `api/lib/types/run.js:37-39`).
- Produces: `License.list(pool)` → `Promise<{ licenses: Array<{ attribution: string|null, license: string|null, sources: [string, string|null][] }> }>`, exposed at `GET /api/licenses`.

- [ ] **Step 1: Write the failing test**

Create `api/test/license.srv.test.js`:

```js
import test from 'node:test';
import assert from 'assert';
import Flight from './flight.js';
import nock from 'nock';

const flight = new Flight();
flight.init();
flight.takeoff();

test('nocks', () => {
    nock.disableNetConnect();

    nock('https://raw.githubusercontent.com')
        .persist()
        .get('/openaddresses/openaddresses/testshaA/sources/ca/mb/brandon.json')
        .reply(200, {
            schema: 2,
            coverage: { country: 'ca' },
            layers: {
                addresses: [{
                    name: 'city',
                    website: 'https://opengov.brandon.ca/OpenDataService/opendata.html',
                    license: {
                        url: 'https://opendata.brandon.ca/terms.aspx',
                        'attribution name': 'City of Brandon',
                        text: 'Contains public sector Datasets made available under the City of Brandon\'s Open Data Licence'
                    }
                }]
            }
        })
        .get('/openaddresses/openaddresses/testshaB/sources/us/ca/sacramento.json')
        .reply(200, {
            schema: 2,
            coverage: { country: 'us' },
            layers: {
                addresses: [{
                    name: 'city',
                    website: 'https://data.cityofsacramento.org',
                    license: {
                        url: 'https://data.cityofsacramento.org/pages/terms',
                        'attribution name': 'City of Sacramento',
                        text: 'Open Data provided by the City of Sacramento'
                    }
                }],
                parcels: [{
                    name: 'city',
                    website: 'https://data.cityofsacramento.org',
                    license: {
                        url: 'https://data.cityofsacramento.org/pages/terms',
                        'attribution name': 'City of Sacramento',
                        text: 'Open Data provided by the City of Sacramento'
                    }
                }],
                buildings: [{
                    name: 'city'
                }]
            }
        });
});

test('POST /api/run', async () => {
    const res = await flight.fetch('/api/run', {
        method: 'POST',
        headers: { 'shared-secret': '123' },
        body: { live: true }
    }, true);

    assert.equal(res.body.id, 1, 'run.id: 1');
});

test('POST /api/run/1/jobs', async () => {
    const res = await flight.fetch('/api/run/1/jobs', {
        method: 'POST',
        headers: { 'shared-secret': '123' },
        body: {
            jobs: [
                'https://raw.githubusercontent.com/openaddresses/openaddresses/testshaA/sources/ca/mb/brandon.json',
                'https://raw.githubusercontent.com/openaddresses/openaddresses/testshaB/sources/us/ca/sacramento.json'
            ]
        }
    }, true);

    assert.deepEqual(res.body, { run: 1, jobs: [1, 2, 3, 4] }, 'Run 1 populated with 4 jobs');
});

test('mark all jobs Success', async () => {
    for (const id of [1, 2, 3, 4]) {
        const res = await flight.fetch(`/api/job/${id}`, {
            method: 'PATCH',
            headers: { 'shared-secret': '123' },
            body: { status: 'Success' }
        }, true);

        assert.equal(res.body.status, 'Success', `job ${id} status: Success`);
    }
});

test('GET /api/licenses groups by attribution + license text', async () => {
    const res = await flight.fetch('/api/licenses', {
        method: 'GET'
    }, true);

    assert.deepEqual(res.body, {
        licenses: [
            {
                attribution: 'City of Brandon',
                license: 'Contains public sector Datasets made available under the City of Brandon\'s Open Data Licence',
                sources: [
                    ['ca/mb/brandon.json', 'https://opengov.brandon.ca/OpenDataService/opendata.html']
                ]
            },
            {
                attribution: 'City of Sacramento',
                license: 'Open Data provided by the City of Sacramento',
                sources: [
                    ['us/ca/sacramento.json', 'https://data.cityofsacramento.org']
                ]
            }
        ]
    }, 'grouped by attribution/license text, deduped by source, unlicensed job excluded');
});

test('cleanup', () => {
    nock.cleanAll();
    nock.enableNetConnect();
});
```

Note on the `true` third argument to `flight.fetch`: this validates the response against `res.Licenses.json` (Step 3 below), same as every other test in this suite.

- [ ] **Step 2: Run test to verify it fails**

Run: `node api/test/license.srv.test.js`
Expected: FAIL at the `GET /api/licenses` step — the route doesn't exist yet (404) and `res.Licenses.json` doesn't exist for schema validation.

- [ ] **Step 3: Write minimal implementation**

Create `api/schema/res.Licenses.json`:

```json
{
    "type": "object",
    "additionalProperties": false,
    "required": ["licenses"],
    "properties": {
        "licenses": {
            "type": "array",
            "items": {
                "type": "object",
                "additionalProperties": false,
                "required": ["attribution", "license", "sources"],
                "properties": {
                    "attribution": { "type": ["string", "null"] },
                    "license": { "type": ["string", "null"] },
                    "sources": {
                        "type": "array",
                        "items": {
                            "type": "array",
                            "minItems": 2,
                            "maxItems": 2,
                            "items": { "type": ["string", "null"] }
                        }
                    }
                }
            }
        }
    }
}
```

Create `api/lib/types/license.js`:

```js
import Err from '@openaddresses/batch-error';
import { sql } from 'slonik';

/**
 * @class
 */
export default class License {
    /**
     * Return all current results with a real license, grouped by
     * (attribution name, license text) into the shape the openaddresses.io
     * attribution page expects.
     *
     * @param {Pool} pool Postgres Pool instance
     */
    static async list(pool) {
        let pgres;
        try {
            pgres = await pool.query(sql`
                SELECT
                    results.source,
                    job.license
                FROM
                    results INNER JOIN job ON results.job = job.id
                WHERE
                    job.license IS NOT NULL
                    AND lower(job.license) != 'false'
                ORDER BY
                    results.source,
                    results.layer,
                    results.name
            `);
        } catch (err) {
            throw new Err(500, new Error(err), 'Failed to list licenses');
        }

        const groups = new Map();

        for (const row of pgres.rows) {
            let license;
            try {
                license = JSON.parse(row.license);
            } catch (err) {
                continue;
            }

            if (!license || typeof license !== 'object') continue;

            const attribution = license['attribution name'] || null;
            const text = license.text || null;
            const website = license.website || null;
            const key = `${attribution} ${text}`;

            if (!groups.has(key)) {
                groups.set(key, {
                    attribution,
                    license: text,
                    sources: [],
                    seen: new Set()
                });
            }

            const group = groups.get(key);
            const sourceKey = `${row.source} ${website}`;
            if (!group.seen.has(sourceKey)) {
                group.seen.add(sourceKey);
                group.sources.push([`${row.source}.json`, website]);
            }
        }

        return {
            licenses: Array.from(groups.values()).map((group) => ({
                attribution: group.attribution,
                license: group.license,
                sources: group.sources
            }))
        };
    }
}
```

Create `api/routes/license.js`:

```js
import Err from '@openaddresses/batch-error';
import License from '../lib/types/license.js';
import Cacher from '../lib/cacher.js';

export default async function router(schema, config) {
    await schema.get('/licenses', {
        name: 'List Licenses',
        group: 'Licenses',
        auth: 'public',
        description: 'Return all sources grouped by license/attribution, for the OpenAddresses website attribution page',
        res: 'res.Licenses.json'
    }, async (req, res) => {
        try {
            const licenses = await config.cacher.get(Cacher.Miss(req.query, 'licenses'), async () => {
                return await License.list(config.pool);
            });

            return res.json(licenses);
        } catch (err) {
            return Err.respond(err, res);
        }
    });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node api/test/license.srv.test.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add api/lib/types/license.js api/routes/license.js api/schema/res.Licenses.json api/test/license.srv.test.js
git commit -m "add GET /api/licenses endpoint"
```

---

### Task 4: Backfill script for existing current results

**Files:**
- Create: `scripts/backfill-license.py`
- Modify: `scripts/README.md` (add a section, following the existing `generate-boundaries.py`/`fix-map-refs.py` doc pattern)

**Interfaces:**
- Consumes: production DB (`results`, `job` tables), GitHub raw source JSON fetched at runtime.
- Produces: `UPDATE job SET license = ...` for jobs referenced by current `results` rows whose source layer has a `license` field.

- [ ] **Step 1: Write the script**

Create `scripts/backfill-license.py`, modeled on `scripts/fix-map-refs.py`:

```python
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
this backfills the ~5k jobs current `results` rows point at by re-fetching
each job's source JSON and re-deriving the license the same way explode() does.

Usage:
  uv run scripts/backfill-license.py "postgresql://user:pass@host:5432/dbname"
  uv run scripts/backfill-license.py "postgresql://..." --dry-run
"""

import argparse
import json
import sys

import psycopg2
import requests


def derive_license(source_json, layer, name):
    """Mirrors the merge logic in api/lib/util.js explode()."""
    layers = source_json.get('layers', {})
    for entry in layers.get(layer, []):
        if entry.get('name') == name:
            license_obj = entry.get('license')
            if not license_obj:
                return None
            return {**license_obj, 'website': entry.get('website')}
    return None


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument('db_uri', help='Postgres connection URI')
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

        if source_url not in cache:
            try:
                resp = requests.get(source_url, timeout=10)
                resp.raise_for_status()
                cache[source_url] = resp.json()
            except Exception as e:
                print(f"  Warning: Failed to fetch {source_url}: {e}", file=sys.stderr)
                cache[source_url] = None

        source_json = cache[source_url]
        if source_json is None:
            skipped += 1
            continue

        license_data = derive_license(source_json, layer, name)
        if license_data is None:
            skipped += 1
            continue

        if args.dry_run:
            print(f"  Would update: job {job_id} -> {json.dumps(license_data)}", file=sys.stderr)
        else:
            cur.execute("UPDATE job SET license = %s WHERE id = %s", (json.dumps(license_data), job_id))
        updated += 1

    if not args.dry_run:
        conn.commit()

    print(f"\nDone: {updated} jobs updated, {skipped} skipped (no license or fetch failed)", file=sys.stderr)

    cur.close()
    conn.close()


if __name__ == '__main__':
    main()
```

- [ ] **Step 2: Dry-run against a local/staging copy**

Run: `uv run scripts/backfill-license.py "postgresql://postgres@localhost:5432/openaddresses_test" --dry-run`
Expected: prints `Would update: job <id> -> {...}` lines for jobs with real license data, and a summary line. No test harness for this script, matching the existing convention for `fix-map-refs.py`/`generate-boundaries.py` (manual verification only).

- [ ] **Step 3: Document it**

Add a section to `scripts/README.md` (append after the existing `generate-boundaries.py` section):

```markdown
## backfill-license.py

One-off backfill for `job.license` on jobs referenced by current `results` rows, needed because `explode()`/`Run.populate()` only started writing `license` going forward (see `docs/superpowers/specs/2026-08-18-license-endpoint-design.md`). Re-fetches each job's source JSON and re-derives the license the same way `explode()` does.

### Usage

Requires [uv](https://docs.astral.sh/uv/).

\`\`\`bash
# Preview what would change
uv run scripts/backfill-license.py "postgresql://user:pass@host:5432/dbname" --dry-run

# Apply
uv run scripts/backfill-license.py "postgresql://user:pass@host:5432/dbname"
\`\`\`
```

- [ ] **Step 4: Commit**

```bash
git add scripts/backfill-license.py scripts/README.md
git commit -m "add backfill script for job.license on current results"
```

---

### Task 5: Point the website at the new endpoint

**Files:**
- Modify: `/Users/iandees/SynologyDrive/Projects/OpenAddresses/openaddresses.io/attribution.html` (this is a separate repo from `batch`)

**Interfaces:**
- Consumes: `GET https://batch.openaddresses.io/api/licenses`, response shape produced by Task 3.

- [ ] **Step 1: Update the fetch URL**

In `attribution.html`, change:

```js
req.open("GET", "https://results.openaddresses.io/latest/licenses.json", false);
```

to:

```js
req.open("GET", "https://batch.openaddresses.io/api/licenses", false);
```

No other changes needed — the response shape matches what the existing parsing code (`data['licenses']`, `.filter(defined).sort(compare)`, per-source `[0]`/`[1]` access) already expects.

- [ ] **Step 2: Manually verify**

With Tasks 1-4 deployed (or a local `batch` API running against a DB with license data), serve the site locally:

```bash
cd /Users/iandees/SynologyDrive/Projects/OpenAddresses/openaddresses.io
bundle exec jekyll serve
```

Load `http://localhost:4000/attribution/` in a browser, open devtools, confirm:
- The request to `/api/licenses` succeeds (no CORS error, status 200).
- The attribution list renders with names and links.

- [ ] **Step 3: Commit**

```bash
cd /Users/iandees/SynologyDrive/Projects/OpenAddresses/openaddresses.io
git add attribution.html
git commit -m "fetch license data from the batch API instead of the dead results.openaddresses.io file"
```

Note: `git status` in this repo currently shows most files as modified due to a pre-existing `100644` → `100755` mode-bit change unrelated to this work (not caused by this plan). Only `attribution.html` should be staged — do not run `git add -A` in this repo.

---

## Rollout (after all tasks complete)

1. Deploy `batch` (Tasks 1-3) to production.
2. Run the Task 4 backfill script against the production DB.
3. Deploy the Task 5 website change.
4. Manually load `https://openaddresses.io/attribution/` and confirm it renders.
