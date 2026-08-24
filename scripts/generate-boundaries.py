#!/usr/bin/env python3
# /// script
# requires-python = ">=3.10"
# dependencies = [
#     "geopandas",
#     "pyogrio",
#     "requests",
#     "boto3",
#     "psycopg2-binary",
# ]
# ///
"""Generate boundary GeoJSON files for OpenAddresses map coverage.

Downloads authoritative boundary data from Natural Earth, US Census,
and ABS, then produces line-delimited GeoJSON files compatible with
Map.populate().

Sources:
  country.geojson  - Natural Earth 10m admin-0 countries
  region.geojson   - Natural Earth 10m admin-1 states/provinces
                   - Mainland Norway counties from Kartverket
  district.geojson - US Census TIGER counties + ABS Australian LGAs

Usage:
  uv run scripts/generate-boundaries.py
  uv run scripts/generate-boundaries.py --verify
  uv run scripts/generate-boundaries.py --upload
"""

import argparse
import json
import os
import sys
import tempfile
from itertools import chain
from pathlib import Path

import geopandas as gpd
import requests

# Natural Earth 10m cultural data
NE_COUNTRIES_URL = "https://naciscdn.org/naturalearth/10m/cultural/ne_10m_admin_0_countries.zip"
NE_REGIONS_URL = "https://naciscdn.org/naturalearth/10m/cultural/ne_10m_admin_1_states_provinces.zip"

# US Census TIGER 2024 county boundaries (500k simplified)
US_COUNTIES_URL = "https://www2.census.gov/geo/tiger/GENZ2024/shp/cb_2024_us_county_500k.zip"

# ABS ASGS Edition 3 LGA boundaries (2021)
ABS_LGA_URL = "https://www.abs.gov.au/statistics/standards/australian-statistical-geography-standard-asgs-edition-3/jul2021-jun2026/access-and-downloads/digital-boundary-files/LGA_2021_AUST_GDA2020_SHP.zip"


def download(url, dest_dir):
    """Download a file to dest_dir, return local path."""
    filename = url.split("/")[-1]
    local_path = os.path.join(dest_dir, filename)
    if os.path.exists(local_path):
        return local_path
    print(f"  Downloading {filename}...", file=sys.stderr)
    resp = requests.get(url, stream=True)
    resp.raise_for_status()
    with open(local_path, "wb") as f:
        for chunk in resp.iter_content(chunk_size=8192):
            f.write(chunk)
    return local_path


def feature_to_geojson(row, name_col, code_col):
    """Convert a GeoDataFrame row to a GeoJSON Feature dict."""
    if row.geometry is None:
        return None
    geom = row.geometry.__geo_interface__
    return {
        "type": "Feature",
        "properties": {
            "name": row[name_col],
            "code": row[code_col],
        },
        "geometry": geom,
    }


def gdf_features(gdf, name_col, code_col):
    """Yield GeoJSON Feature dicts from a GeoDataFrame."""
    return (feature_to_geojson(row, name_col, code_col) for _, row in gdf.iterrows())


def write_ld_geojson(gdf, output_path, name_col, code_col):
    """Write a GeoDataFrame as line-delimited GeoJSON with {name, code} properties."""
    return write_features(gdf_features(gdf, name_col, code_col), output_path)


def write_features(features, output_path):
    """Write an iterable of GeoJSON Feature dicts as line-delimited GeoJSON."""
    count = 0
    with open(output_path, "w") as f:
        for feature in features:
            if feature is None:
                continue
            f.write(json.dumps(feature, separators=(",", ":")) + "\n")
            count += 1
    print(f"  Wrote {count} features to {output_path}", file=sys.stderr)
    return count


def generate_countries(tmpdir, output_dir):
    """Generate country.geojson from Natural Earth."""
    print("Generating country.geojson...", file=sys.stderr)
    path = download(NE_COUNTRIES_URL, tmpdir)
    gdf = gpd.read_file(path)

    # Use ISO_A2_EH for codes (fixes Norway, France, etc. which have -99 in ISO_A2)
    gdf = gdf[
        gdf["ISO_A2_EH"].notna()
        & (gdf["ISO_A2_EH"] != "-99")
        & (gdf["ISO_A2_EH"] != "-1")
    ]
    gdf["code"] = gdf["ISO_A2_EH"].str.lower()
    gdf["label"] = gdf["FORMAL_EN"].fillna(gdf["NAME"])

    gdf = gdf.to_crs(epsg=4326)

    output_path = os.path.join(output_dir, "country.geojson")
    return write_ld_geojson(gdf, output_path, "label", "code")


class RegionOverride:
    """Replaces one country's Natural Earth admin-1 regions with authoritative data.

    Natural Earth's admin-1 dataset lags administrative reforms. A subclass
    sets ``prefix`` (e.g. ``"no-"``) and any ``keep`` codes to retain from
    Natural Earth, then yields replacement features from ``features()``. Add a
    country by writing a subclass and registering it in ``REGION_OVERRIDES``.
    """

    prefix = ""
    keep = frozenset()

    def drops(self, code):
        """Return True if a Natural Earth region code should be dropped."""
        return code.startswith(self.prefix) and code not in self.keep

    def features(self):
        """Yield replacement GeoJSON Feature dicts."""
        raise NotImplementedError


class NorwayRegions(RegionOverride):
    """Current mainland Norway counties from Kartverket.

    Kartverket omits Svalbard, so Natural Earth's no-21 feature is retained.
    """

    prefix = "no-"
    keep = frozenset({"no-21"})
    api = "https://api.kartverket.no/kommuneinfo/v1/fylker"

    def features(self):
        with requests.Session() as session:
            counties = session.get(self.api, timeout=60)
            counties.raise_for_status()

            for county in sorted(counties.json(), key=lambda c: c["fylkesnummer"]):
                number = county["fylkesnummer"]
                if not (isinstance(number, str) and number.isdigit() and len(number) == 2):
                    raise ValueError(f"Invalid Kartverket county number: {number!r}")

                area = session.get(
                    f"{self.api}/{number}/omrade",
                    params={"utkoordsys": 4326},
                    timeout=60,
                )
                area.raise_for_status()
                geometry = area.json()["omrade"]

                yield {
                    "type": "Feature",
                    "properties": {
                        "name": county["fylkesnavn"],
                        "code": f"no-{number}",
                    },
                    "geometry": {
                        "type": geometry["type"],
                        "coordinates": geometry["coordinates"],
                    },
                }


REGION_OVERRIDES = [NorwayRegions()]


def generate_regions(tmpdir, output_dir):
    """Generate region.geojson from Natural Earth plus per-country overrides."""
    print("Generating region.geojson...", file=sys.stderr)
    path = download(NE_REGIONS_URL, tmpdir)
    gdf = gpd.read_file(path)

    # Filter out features with -99 or empty iso_3166_2 codes
    gdf = gdf[
        gdf["iso_3166_2"].notna()
        & (gdf["iso_3166_2"] != "")
        & ~gdf["iso_3166_2"].str.startswith("-99")
    ]
    gdf["code"] = gdf["iso_3166_2"].str.lower()

    # Drop the base regions an override replaces with authoritative data.
    for override in REGION_OVERRIDES:
        gdf = gdf[~gdf["code"].map(override.drops)]

    gdf = gdf.to_crs(epsg=4326)

    overrides = chain.from_iterable(o.features() for o in REGION_OVERRIDES)
    output_path = os.path.join(output_dir, "region.geojson")
    return write_features(
        chain(gdf_features(gdf, "name", "code"), overrides), output_path
    )


def generate_districts(tmpdir, output_dir):
    """Generate district.geojson from US Census counties + ABS LGAs."""
    print("Generating district.geojson...", file=sys.stderr)

    # US Census counties
    us_path = download(US_COUNTIES_URL, tmpdir)
    us = gpd.read_file(us_path)
    us["code"] = "us-" + us["STATEFP"] + us["COUNTYFP"]
    us["label"] = us["NAMELSAD"]
    us = us.to_crs(epsg=4326)

    # ABS Australian LGAs
    au_path = download(ABS_LGA_URL, tmpdir)
    au = gpd.read_file(au_path)
    # Filter out non-LGA entries
    au = au[~au["LGA_NAME21"].str.contains("Unincorporated|No usual|Migratory", na=False)]
    au["code"] = "au-" + au["LGA_CODE21"]
    au["label"] = au["LGA_NAME21"]
    au = au.to_crs(epsg=4326)

    features = chain(
        gdf_features(us, "label", "code"),
        gdf_features(au, "label", "code"),
    )
    output_path = os.path.join(output_dir, "district.geojson")
    return write_features(features, output_path)


def verify(output_dir, aws_profile=None):
    """Compare generated files against existing S3 files."""
    import boto3

    session = boto3.Session(profile_name=aws_profile)
    s3 = session.client("s3")

    for filename in ["country.geojson", "region.geojson", "district.geojson"]:
        print(f"\nVerifying {filename}...", file=sys.stderr)

        # Load generated codes
        generated_codes = set()
        local_path = os.path.join(output_dir, filename)
        with open(local_path) as f:
            for line in f:
                line = line.strip()
                if not line:
                    continue
                feat = json.loads(line)
                generated_codes.add(feat["properties"]["code"])

        # Load existing codes from S3
        existing_codes = set()
        resp = s3.get_object(Bucket="v2.openaddresses.io", Key=filename)
        for line in resp["Body"].iter_lines():
            line = line.decode("utf-8").strip()
            if not line:
                continue
            feat = json.loads(line)
            existing_codes.add(feat["properties"]["code"])

        added = generated_codes - existing_codes
        removed = existing_codes - generated_codes

        print(f"  Existing: {len(existing_codes)} codes", file=sys.stderr)
        print(f"  Generated: {len(generated_codes)} codes", file=sys.stderr)

        if removed:
            print(f"  REMOVED ({len(removed)}):", file=sys.stderr)
            for code in sorted(removed):
                print(f"    - {code}", file=sys.stderr)

        if added:
            print(f"  ADDED ({len(added)}):", file=sys.stderr)
            for code in sorted(added):
                print(f"    + {code}", file=sys.stderr)

        if not added and not removed:
            print("  No code differences", file=sys.stderr)


def upload(output_dir, aws_profile=None):
    """Upload generated files to S3."""
    import boto3

    session = boto3.Session(profile_name=aws_profile)
    s3 = session.client("s3")

    for filename in ["country.geojson", "region.geojson", "district.geojson"]:
        local_path = os.path.join(output_dir, filename)
        print(f"Uploading {filename} to s3://v2.openaddresses.io/{filename}...", file=sys.stderr)
        s3.upload_file(
            local_path,
            "v2.openaddresses.io",
            filename,
            ExtraArgs={"ContentType": "application/geo+json"},
        )
        print(f"  Done", file=sys.stderr)


def populate_db(output_dir, db_uri):
    """Load generated boundaries into the map table.

    Existing rows are updated in place so jobs keep their map identifiers.
    Missing rows are inserted. Custom geometries added by Map.match()
    (hash-based codes) are preserved.
    """
    import psycopg2

    conn = psycopg2.connect(db_uri)
    cur = conn.cursor()

    for filename in ["country.geojson", "region.geojson", "district.geojson"]:
        local_path = os.path.join(output_dir, filename)
        print(f"Populating database from {filename}...", file=sys.stderr)

        count = 0
        with open(local_path) as f:
            for line in f:
                line = line.strip()
                if not line:
                    continue
                feat = json.loads(line)
                name = feat["properties"]["name"]
                code = feat["properties"]["code"]
                geom = json.dumps(feat["geometry"])

                cur.execute(
                    """
                    UPDATE map
                    SET name = %s,
                        geom = ST_SetSRID(ST_GeomFromGeoJSON(%s), 4326)
                    WHERE code = %s
                    """,
                    (name, geom, code),
                )
                if cur.rowcount == 0:
                    cur.execute(
                        """
                        INSERT INTO map (name, code, geom)
                        VALUES (%s, %s, ST_SetSRID(ST_GeomFromGeoJSON(%s), 4326))
                        """,
                        (name, code, geom),
                    )
                count += 1

        print(f"  Loaded {count} features", file=sys.stderr)

    conn.commit()
    cur.close()
    conn.close()
    print("Done", file=sys.stderr)


def main():
    parser = argparse.ArgumentParser(
        description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter
    )
    parser.add_argument(
        "--output-dir",
        default="scripts/output",
        help="Output directory (default: scripts/output)",
    )
    parser.add_argument(
        "--upload", action="store_true", help="Upload generated files to S3"
    )
    parser.add_argument(
        "--verify",
        action="store_true",
        help="Compare output against existing S3 files",
    )
    parser.add_argument(
        "--db",
        metavar="URI",
        help="Postgres URI — upsert boundaries into the map table",
    )
    parser.add_argument(
        "--aws-profile",
        metavar="PROFILE",
        help="AWS profile name for S3 access (used by --upload and --verify)",
    )
    args = parser.parse_args()

    output_dir = args.output_dir
    os.makedirs(output_dir, exist_ok=True)

    with tempfile.TemporaryDirectory() as tmpdir:
        generate_countries(tmpdir, output_dir)
        generate_regions(tmpdir, output_dir)
        generate_districts(tmpdir, output_dir)

    if args.verify:
        verify(output_dir, aws_profile=args.aws_profile)

    if args.upload:
        upload(output_dir, aws_profile=args.aws_profile)

    if args.db:
        populate_db(output_dir, args.db)


if __name__ == "__main__":
    main()
