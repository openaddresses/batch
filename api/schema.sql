CREATE EXTENSION "uuid-ossp";

-- A job corresponds 1:1 with a batch task
-- Each batch task processes a single name, of a single layer, from a single source
CREATE TABLE job (
    id          UUID PRIMARY KEY,
    set         UUID, -- If part of a set
    created     TIMESTAMP,
    url         TEXT, -- URL to Source JSON
    layer       TEXT, -- Data Layer to process
    name        TEXT, -- Data provider to process
    output      TEXT, -- Final S3 Location (geojson.gz)
    loglink     TEXT, -- LogLink to CloudWatch (expires)
    status      TEXT, -- Pending, Success, Fail
    version     TEXT -- Version of Batch to run the job
);

CREATE TABLE runs (
    id          UUID PRIMARY KEY,
    created     TIMESTAMP,
    github      JSONB -- If a GH CI response, store data needed to return status
);
