# Scripts

Utility scripts for managing OpenAddresses batch infrastructure data.

## generate-boundaries.py

Generates the three boundary GeoJSON files used by the map coverage system (`country.geojson`, `region.geojson`, `district.geojson`). These files are loaded into the `map` database table via `Map.populate()` and used to show data coverage on the batch.openaddresses.io map.

### Data sources

| File | Source | Description |
|------|--------|-------------|
| `country.geojson` | [Natural Earth](https://www.naturalearthdata.com/) 10m admin-0 | Country boundaries using `ISO_A2_EH` codes |
| `region.geojson` | Natural Earth 10m admin-1 | State/province boundaries using `iso_3166_2` codes |
| `district.geojson` | [US Census TIGER](https://www.census.gov/geographies/mapping-files/time-series/geo/tiger-line-file.html) 2024 counties + [ABS](https://www.abs.gov.au/) ASGS LGA 2021 | US county and Australian LGA boundaries |

### Usage

Requires [uv](https://docs.astral.sh/uv/). Dependencies are declared inline via PEP 723 script metadata.

```bash
# Generate files to scripts/output/
uv run scripts/generate-boundaries.py

# Compare generated output against existing S3 files
uv run scripts/generate-boundaries.py --verify

# Upload generated files to S3 (uses "openaddresses" AWS profile)
uv run scripts/generate-boundaries.py --upload

# Load boundaries directly into the map database table
uv run scripts/generate-boundaries.py --db "postgresql://user:pass@host:5432/dbname"
```

### How coverage works

1. These GeoJSON files provide **base boundaries** (countries, states, counties/LGAs)
2. `Map.populate()` loads them into the `map` table on API startup (with `--populate` flag)
3. When jobs run, `Map.match()` links each job to a map boundary based on its source's `coverage` field — it can also add custom geometries for sources that define their own coverage polygons
4. The fabric job reads all map features from the database and generates `borders.pmtiles` for the frontend coverage map
