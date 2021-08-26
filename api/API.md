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
A valid API token must generated for programatic access

_Example_
```
Authorization: Bearer <api token>
```

#### Javascript Fetch Example
```js
fetch('https://batch.openaddresses.io/api/data', {
    method: 'GET',
    withCredentials: true,
    credentials: 'include',
    headers: {
        'Authorization': 'oa.1234-your-token-here-5678',
        'Content-Type': 'application/json'
    }
});
```
