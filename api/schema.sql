-- Store the latest known good data for a given source
CREATE TABLE IF NOT EXISTS results (
    source      TEXT,
    created     TIMESTAMP,
    layer       TEXT,
    name        TEXT,
    url         TEXT
);

-- A job corresponds 1:1 with a batch task
-- Each batch task processes a single name, of a single layer, from a single source
CREATE TABLE IF NOT EXISTS job (
    id          BIGSERIAL PRIMARY KEY,
    run         BIGINT, -- run id
    created     TIMESTAMP,
    source      TEXT, -- URL to Source JSON
    layer       TEXT, -- Data Layer to process
    name        TEXT, -- Data provider to process
    output      TEXT, -- Final S3 Location (geojson.gz)
    loglink     TEXT, -- LogLink to CloudWatch (expires)
    status      TEXT, -- Pending, Success, Fail
    version     TEXT  -- Version of Batch to run the job
);

CREATE TABLE IF NOT EXISTS runs (
    id          BIGSERIAL PRIMARY KEY,
    created     TIMESTAMP,
    github      JSONB, -- If a GH CI response, store data needed to return status
    closed      BOOL
);
