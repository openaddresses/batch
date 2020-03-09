<h1 align=center>OpenAddresses Batch</h1>

## Deploy

Before you are able to deploy infrastructure you must first setup the [OpenAddresses Deploy tools](https://github.com/openaddresses/deploy)

Once these are installed, you can create the production stack via:
(Note: it should already exist!)

```sh
deploy create production
```

Or update to the latest GitSha or CloudFormation template via

```sh
deploy update production
```

### Parameters

#### GitSha

On every commit, GitHub actions will build the latest Docker image and push it to the `batch` ECR.
This parameter will be populated automatically by the `deploy` cli and simply points the stack
to use the correspondingly Docker image from ECR.

#### SharedSecret

API functions that are public currently do not require any auth at all. Internal functions however are protected
by a stack-wide shared secret. This secret is an alpha-numeric string that is included in a `secret` header, to
authenticate internal API calls.

This value can be any secure alpha-numeric combination of characters and is safe to change at any time.

#### GithubSecret

This is the secret that Github uses to sign API events that are sent to this API. This shared signature allows
us to verify that events are from github. Only the production stack should use this parameter.

#### Bucket

The bucket in which assets should be saved to. See the `S3 Assets` section of this document for more information

## Components

The project is divided into several componenets

| Component | Purpose |
| --------- | ------- |
| cloudformation | Deploy Configuration |
| api | Dockerized server for handling all API interactions |
| cli | CLI for manually queueing work to batch |
| lambda | Lambda responsible for instantiating a batch job environement and submitting it |
| task | Docker container for running a batch job |

## S3 Assets

By default, processed job assets are uploaded to the bucket `v2.openaddresses.io` in the following format

```
s3://v2.openaddresses.io/<stack>/job/<job_id>/job.json
s3://v2.openaddresses.io/<stack>/job/<job_id>/job.png
s3://v2.openaddresses.io/<stack>/job/<job_id>/job.geojson
s3://v2.openaddresses.io/<stack>/job/<job_id>/raw/
```

## API

All infrastructure in this repo must be used via the REST API. Individual
components should never be fired directly to ensure database state.

### Server

#### GET `/` (Public)

OpenAddresses Data UI

#### GET `/api` (Public)

Returns high level info about the API

```JSON
{
    "version": "1.0.0"
}
```

#### GET `/api/health` (Public)

Returns a simple HTTP 200 Healthcheck

### Runs

#### GET `/api/run` (Public)

Return information about a filtered set of runs

#### POST `/api/run` (Internal)

Create a new run

#### GET `/api/run/<run>` (Public)

Get an individual run

#### PATCH `/api/run/<run>` (Internal)

Update an individual run

#### POST `/api/run/<run>/jobs` (Internal)

Given a source file, create jobs for all permutations

#### GET `/api/run/<run>/jobs` (Public)

Return all of the jobs for a given run

### Jobs

#### GET `/api/job` (Public)

Return information about a filtered set of jobs

#### GET `/api/job/<job>` (Public)

Return information about a single job

#### GET `/api/job/<job>/log` (Public)

If the job has started, return a log of the job's batch task

#### PATCH `/api/job/<job>` (Internal)

### CI

#### POST `/api/github/event` (Internal)

Accept and handle Github.com Events

