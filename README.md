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

## Components

The project is divided into several componenets

| Component | Purpose |
| --------- | ------- |
| cloudformation | Deploy Configuration |
| api | Dockerized server for handling all API interactions |
| cli | CLI for manually queueing work to batch |
| lambda | Lambda responsible for instantiating a batch job environement and submitting it |
| task | Docker container for running a batch job |

## API

All infrastructure in this repo must be used via the REST API. Individual
components should never be fired directly to ensure database state.

### Server

### GET `/` (Public)

Healthcheck, returns 200 if the server is healthy

#### GET `/api` (Public)

Returns high level info about the API

```JSON
{
    "version": "1.0.0"
}
```

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

### Jobs

#### GET `/api/job/<job>` (Public)

#### PATCH `/api/job/<job>` (Internal)

