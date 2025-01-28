## Authentication

### UI Flow

Initial authentication must always first be performed with a successful POST of the username &
password to the `/login` endpoint.

This is most commonly done via the [UI](https://batch.openaddresses.io/login).

Once logged in, from the User's [Profile Page](https://batch.openaddresses.io/profile), a new
API token can be created. Please note that the token will only be shown once. If you lose the token,
you should delete it from your token list and generate a new token.

### Programatic Flow

Once an API token has been obtained, scripted calls to the API can be made by using the Bearer
Authentication. This header must be included with all calls to the API.

Note: Basic authentication (username, password) is not supported by any API endpoint other than initial login.
A valid API token must be generated for programmatic access

_Example_
``` 
##### To Get List of Collections ##Rest HTTP
GET https://batch.openaddresses.io/api/collections
Authorization: Bearer {api token}
Content-Type: application/json

```

#### Javascript Fetch Example
```js
fetch('https://batch.openaddresses.io/api/data', {
    method: 'GET',
    withCredentials: true,
    credentials: 'include',
    headers: {
        'Authorization': 'Bearer oa.1234-your-token-here-5678',
        'Content-Type': 'application/json'
    }
});
```

## Backer Benefits

### Custom Exports

Backers have the ability to generate 300 custom exports per month for any of our sources.

Current data formats that can be exported in are `csv` and `shapefiles`. GeoJSON files will
always remain free to download for all users

## Sponsor Benefits

Sponsors have access to all of the benefits that a Backer receives as well as the following.

### Direct AWS S3

Sponsors have direct requester-pays access to our AWS S3 bucket for the fastest access.
Endpoints that track data will return an `s3` key as part of the JSON response with a
full S3 URL to the file in question.

It should be noted that files themselves  on S3 are subject to change and the current location
of a file on S3 is not guaranteed. The API will always return the most up-to-date location.

### Validated Data {Experimental}

Validated data improves upon the authoritative data provided and curated by government entities.

We currently only generate validated data for `address` sources

- Remove data with no geometry/incorrect geometries
- Remove data with no/invalid street numbers
- Remove data with no/invalid street name

Future Operations
- Perform Abbreviation Expansion (`E` => `East`, etc.)
- Clip data to expected geographic area to ensure erroneous data isn't included (IE: Null Islands)
- Add City/Postcode/Region/State data where it doesn't exist
