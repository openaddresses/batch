# License endpoint design

## Problem

`openaddresses.io/attribution/` fetches `https://results.openaddresses.io/latest/licenses.json`
client-side. That URL now 302-redirects to a presigned Cloudflare R2 URL with no CORS headers on
the redirect hop, so the browser fetch fails (openaddresses/openaddresses.io#88). The underlying
file is also a frozen artifact of the old Python `machine` pipeline and hasn't been regenerated
since batch took over processing.

`job.license` already exists as a column on `batch`'s `job` table (TEXT, JSON-serialized, read
path already implemented in `Job.serialize()`) but nothing has ever written a real value into it —
confirmed via direct query against production: 205,843/205,843 jobs are `'false'` or `NULL`.

## Goal

Serve the same data attribution.html needs (grouped by license: attribution name, license text,
and the list of `[source path, source website]` pairs) from a new `batch` API endpoint, sourced
from live source JSON definitions rather than a stale static file.

## Non-goals

- No changes to `batch-machine` or the task runner's job-completion reporting.
- No PATCH schema change on `/job/:job` — license is written at job-creation time, not completion
  time.
- No attempt to exactly reproduce the legacy grouping algorithm from `machine/openaddr/conform.py`
  — grouping by `(attribution name, license text)` is a close, sufficient equivalent.

## Design

### 1. Populate `job.license` at job-creation time

In `batch/api/lib/util.js`, `explode()` builds one job spec per `source.layers[layer]` entry (`j`).
`j.license` and `j.website` are both present on that same per-layer object already (confirmed
against `sources/ca/mb/brandon.json`, where `website` and `license` are sibling keys inside the
same layer object). Add to the job spec:

```js
license: { ...j.license, website: j.website }
```

`Job.generate()` → `Generic.generate()`/`commit()` (in `@openaddresses/batch-generic`) writes any
key present on the object straight to the matching Postgres column, auto-`JSON.stringify`-ing
plain objects.

However, `Run.populate()` (`batch/api/lib/types/run.js`, ~line 227) currently reconstructs the job
object passed to `Job.generate()` as a literal `{ run, source, layer, name }`, dropping any other
field `explode()` put on `jobs[i]`. It needs to also pass through `license: jobs[i].license` for
the new field to actually reach the database.

### 2. Backfill current results

New jobs populate `license` going forward, but existing rows in `results` (current job per
source/layer/name; 5,119 rows in production today) won't get it until each source is re-run. Write
a one-off backfill script that, for each `results` row, re-fetches the source JSON (same lookup
`explode()` performs), extracts the matching layer's `{license, website}`, and runs a targeted
`UPDATE job SET license = $1 WHERE id = $2` against just that job id. Run once, after step 1 is
deployed.

### 3. New `GET /api/licenses` endpoint

New route in `batch/api/routes/`. Joins `results` → `job` where `job.license` is non-null and not
`'false'`, groups by `(license["attribution name"], license.text)`, and returns:

```json
{
  "licenses": [
    {
      "attribution": "City of Brandon",
      "license": "Contains public sector Datasets made available under the City of Brandon's Open Data Licence (...)",
      "sources": [["ca/mb/brandon.json", "https://opengov.brandon.ca/OpenDataService/opendata.html"]]
    }
  ]
}
```

Field mapping from the stored `job.license` object: `attribution` ← `license["attribution name"]`
(may be absent → serialize as `null`), `license` ← `license.text`, `sources[i][1]` ← the merged-in
`website`. `sources[i][0]` is the `source/layer/name` path used elsewhere in the API (e.g.
`ca/mb/brandon.json`).

Entries with no attribution name serialize as `attribution: null`. This is safe for the existing
client: `attribution.html`'s filter is `a['attribution'] != undefined`, which uses loose equality
so `null` is treated the same as `undefined` and gets filtered out, matching current behavior.

### 4. Website change

In `openaddresses.io/attribution.html`, change the fetch URL from
`https://results.openaddresses.io/latest/licenses.json` to
`https://batch.openaddresses.io/api/licenses`. No other client code changes — response shape
matches what the existing parsing logic expects. Confirm the batch API's existing CORS middleware
covers the new route (it's a public API; other `/api/*` routes already work cross-origin from the
site).

## Testing

- Unit test for the `explode()` change: given a source JSON with a layer `license`/`website`, the
  generated job spec includes the merged `license` object.
- Manual check of `/api/licenses` output shape against a saved sample of the old `licenses.json`.
- Manual load of `attribution.html` pointed at a local/staging batch API to confirm rendering.

## Rollout

1. Deploy the `explode()` change to production `batch` (new jobs start populating `license`).
2. Run the backfill script once against production.
3. Deploy the new `/api/licenses` endpoint.
4. Update and deploy `attribution.html`.
