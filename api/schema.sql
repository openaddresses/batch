CREATE EXTENSION IF NOT EXISTS POSTGIS;

CREATE TABLE IF NOT EXISTS users (
    id          BIGSERIAL PRIMARY KEY,
    username    TEXT UNIQUE NOT NULL,
    email       TEXT UNIQUE NOT NULL,
    password    TEXT NOT NULL
);

-- Store coverage map
CREATE TABLE IF NOT EXISTS map (
    name        TEXT,                       -- Common Name
    code        TEXT,                       -- ISO Country/Region Code
    geom        GEOMETRY(GEOMETRY, 4326),   -- Geometry
    layers      TEXT[]                      -- ["layer", ... ]
);

-- Store the latest known good data for a given source
CREATE TABLE IF NOT EXISTS results (
    source      TEXT,       -- text name of the source "us/ca/orange"
    updated     TIMESTAMP,  -- timestamp as to when the data was last successfully updated
    layer       TEXT,       -- name of the layer "addresses"
    name        TEXT,       -- name of the provider within the layer
    job         BIGINT      -- Job ID that ran the last successful source
);

-- A job corresponds 1:1 with a batch task
-- Each batch task processes a single name, of a single layer, from a single source
CREATE TABLE IF NOT EXISTS job (
    id          BIGSERIAL PRIMARY KEY,
    run         BIGINT,     -- run id
    created     TIMESTAMP,
    source      TEXT,       -- URL to Source JSON
    layer       TEXT,       -- Data Layer to process
    name        TEXT,       -- Data provider to process
    output      JSONB,      -- Final S3 Location (geojson.gz)
    loglink     TEXT,       -- LogLink to CloudWatch (expires)
    status      TEXT,       -- Pending, Success, Fail
    stats       JSONB,
    bounds      GEOMETRY(POLYGON, 4326),
    version     TEXT        -- Version of Batch to run the job
);

CREATE TABLE IF NOT EXISTS runs (
    id          BIGSERIAL PRIMARY KEY,
    live        BOOLEAN,    -- If the run is a scheduled run, or the data has been merged into master
    created     TIMESTAMP,
    github      JSONB,      -- If a GH CI response, store data needed to return status
    closed      BOOL
);

