CREATE EXTENSION IF NOT EXISTS POSTGIS;

CREATE TABLE IF NOT EXISTS users (
    id          BIGSERIAL PRIMARY KEY,
    username    TEXT UNIQUE NOT NULL,
    email       TEXT UNIQUE NOT NULL,
    password    TEXT NOT NULL
);

-- Store recent live job errors (reset on every scheduled run)
CREATE TABLE IF NOT EXISTS job_errors (
    job         BIGINT UNIQUE NOT NULL, -- Job ID reference
    message     TEXT NOT NULL           -- Human readable failure message
);

-- Store coverage map
CREATE TABLE IF NOT EXISTS map (
    id          BIGSERIAL,                  -- Map ID
    name        TEXT,                       -- Common Name
    code        TEXT,                       -- ISO Country/Region Code
    geom        GEOMETRY(GEOMETRY, 4326)    -- Geometry
);

-- Store the latest known good data for a given source
CREATE TABLE IF NOT EXISTS results (
    id          BIGSERIAL,  -- Data Entry ID
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
    run         BIGINT,     -- run ID
    map         BIGINT,     -- Map coverage ID
    created     TIMESTAMP,  -- Job submission timestamp
    source      TEXT,       -- URL to Source JSON
    source_name TEXT,       -- Name of source (us/ca/statewide)
    layer       TEXT,       -- Data Layer to process
    name        TEXT,       -- Data provider to process
    output      JSONB,      -- Final S3 Location (geojson.gz)
    loglink     TEXT,       -- LogLink to CloudWatch (expires)
    status      TEXT,       -- Pending, Success, Fail
    stats       JSONB,      -- Layer specific stats
    count       BIGINT,     -- Number of processed features
    bounds      GEOMETRY(POLYGON, 4326), -- Polygon of bounds
    version     TEXT        -- Version of Batch to run the job
);

CREATE TABLE IF NOT EXISTS runs (
    id          BIGSERIAL PRIMARY KEY,
    live        BOOLEAN,    -- If the run is a scheduled run, or the data has been merged into master
    created     TIMESTAMP,
    github      JSONB,      -- If a GH CI response, store data needed to return status
    closed      BOOL
);

