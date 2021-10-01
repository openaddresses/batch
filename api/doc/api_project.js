define({
  "name": "OpenAddresses API",
  "title": "OpenAddresses API",
  "header": {
    "title": "Authentication",
    "content": "<h2>Authentication</h2>\n<h3>UI Flow</h3>\n<p>Initial authentication must always first be performed with a successful POST of the username &amp;\npassword to the <code>/login</code> endpoint.</p>\n<p>This is most commonly done via the <a href=\"https://batch.openaddresses.io/login\">UI</a>.</p>\n<p>Once logged in, from the User's <a href=\"https://batch.openaddresses.io/profile\">Profile Page</a>, a new\nAPI token can be created. Please note that the token will only be shown once. If you lose the token,\nyou should delete it from your token list and generate a new token.</p>\n<h3>Programatic Flow</h3>\n<p>Once an API token has been obtained, scripted calls to the API can be made by using the Bearer\nAuthentication. This header must be included with all calls to the API.</p>\n<p>Note: Basic authentication (username, password) is not supported by any API endpoint other than initial login.\nA valid API token must generated for programatic access</p>\n<p><em>Example</em></p>\n<pre class=\"prettyprint\">Authorization: Bearer <api token>\n</code></pre>\n<h4>Javascript Fetch Example</h4>\n<pre class=\"prettyprint lang-js\">fetch('https://batch.openaddresses.io/api/data', {\n    method: 'GET',\n    withCredentials: true,\n    credentials: 'include',\n    headers: {\n        'Authorization': 'oa.1234-your-token-here-5678',\n        'Content-Type': 'application/json'\n    }\n});\n</pre>\n<h2>Backer Benefits</h2>\n<h2>Sponsor Benefits</h2>\n<p>Sponsors have direct requester-pays access to our AWS S3 bucket for the fastest access.\nEndpoints that track data will return an <code>s3</code> key as part of the JSON response with a\nfull S3 URL to the file in question.</p>\n<p>It should be noted that files themselves  on S3 are subject to change and the current location\nof a file on S3 is not guarenteed. The API will always return the most up-to-date location.</p>\n"
  },
  "version": "1.0.0",
  "description": "",
  "sampleUrl": false,
  "defaultVersion": "0.0.0",
  "apidoc": "0.3.0",
  "generator": {
    "name": "apidoc",
    "time": "2021-10-01T16:52:23.494Z",
    "url": "https://apidocjs.com",
    "version": "0.29.0"
  }
});
