define({ "api": [
  {
    "type": "get",
    "url": "/api/dash/collections",
    "title": "Collection Counts",
    "version": "1.0.0",
    "name": "CollectionsAnalytics",
    "group": "Analytics",
    "permission": [
      {
        "name": "admin",
        "title": "Admin",
        "description": "<p>The user must be an admin to use this endpoint</p>"
      }
    ],
    "description": "<p>Report anonymized traffic data about the number of collection downloads.</p>",
    "filename": "./index.js",
    "groupTitle": "Analytics"
  },
  {
    "type": "get",
    "url": "/api/dash/traffic",
    "title": "Session Counts",
    "version": "1.0.0",
    "name": "TrafficAnalytics",
    "group": "Analytics",
    "permission": [
      {
        "name": "admin",
        "title": "Admin",
        "description": "<p>The user must be an admin to use this endpoint</p>"
      }
    ],
    "description": "<p>Report anonymized traffic data about the number of user sessions created in a given day.</p>",
    "filename": "./index.js",
    "groupTitle": "Analytics"
  },
  {
    "type": "post",
    "url": "/api/collections",
    "title": "Create Collection",
    "version": "1.0.0",
    "name": "CreateCollection",
    "group": "Collections",
    "permission": [
      {
        "name": "admin",
        "title": "Admin",
        "description": "<p>The user must be an admin to use this endpoint</p>"
      }
    ],
    "description": "<p>Create a new collection</p>",
    "filename": "./index.js",
    "groupTitle": "Collections"
  },
  {
    "type": "get",
    "url": "/api/collections/:collection/data",
    "title": "Get Collection Data",
    "version": "1.0.0",
    "name": "DataCollection",
    "group": "Collections",
    "permission": [
      {
        "name": "user",
        "title": "User",
        "description": "<p>A user must be logged in to use this endpoint</p>"
      }
    ],
    "description": "<p>Download a given collection file</p> <p>Note: the user must be authenticated to perform a download. One of our largest costs is S3 egress, authenticated downloads allow us to prevent abuse, keep the project running and the data free.</p> <p>Faster Downloads? Have AWS? The Jobs, Data, &amp; Collections API all return an <code>s3</code> property which links to a requester pays object on S3. For those that are able, this is the best way to download data.</p> <p>OpenAddresses is entirely funded by volunteers (many of them the developers themselves!) Please consider donating if you are able https://opencollective.com/openaddresses</p>",
    "parameter": {
      "fields": {
        "Parameter": [
          {
            "group": "Parameter",
            "type": "Number",
            "optional": false,
            "field": ":collection",
            "description": "<p>Collection ID</p>"
          }
        ]
      }
    },
    "filename": "./index.js",
    "groupTitle": "Collections"
  },
  {
    "type": "delete",
    "url": "/api/collections/:collection",
    "title": "Delete Collection",
    "version": "1.0.0",
    "name": "DeleteCollection",
    "group": "Collections",
    "permission": [
      {
        "name": "admin",
        "title": "Admin",
        "description": "<p>The user must be an admin to use this endpoint</p>"
      }
    ],
    "description": "<p>Delete a collection (This should not be done lightly)</p>",
    "parameter": {
      "fields": {
        "Parameter": [
          {
            "group": "Parameter",
            "type": "Number",
            "optional": false,
            "field": ":collection",
            "description": "<p>Collection ID</p>"
          }
        ]
      }
    },
    "filename": "./index.js",
    "groupTitle": "Collections"
  },
  {
    "type": "get",
    "url": "/api/collections",
    "title": "List Collections",
    "version": "1.0.0",
    "name": "ListCollections",
    "group": "Collections",
    "permission": [
      {
        "name": "public",
        "title": "Public",
        "description": "<p>This API endpoint does not require authentication</p>"
      }
    ],
    "description": "<p>Return a list of all collections and their glob rules</p>",
    "filename": "./index.js",
    "groupTitle": "Collections"
  },
  {
    "type": "patch",
    "url": "/api/collections/:collection",
    "title": "Patch Collection",
    "version": "1.0.0",
    "name": "PatchCollection",
    "group": "Collections",
    "permission": [
      {
        "name": "admin",
        "title": "Admin",
        "description": "<p>The user must be an admin to use this endpoint</p>"
      }
    ],
    "description": "<p>Update a collection</p>",
    "parameter": {
      "fields": {
        "Parameter": [
          {
            "group": "Parameter",
            "type": "Number",
            "optional": false,
            "field": ":collection",
            "description": "<p>Collection ID</p>"
          }
        ]
      }
    },
    "filename": "./index.js",
    "groupTitle": "Collections"
  },
  {
    "type": "get",
    "url": "/api/job/error/:job",
    "title": "Get Job Error",
    "version": "1.0.0",
    "name": "ErrorList",
    "group": "ErrorSingle",
    "permission": [
      {
        "name": "public",
        "title": "Public",
        "description": "<p>This API endpoint does not require authentication</p>"
      }
    ],
    "description": "<p>Return a single job error if one exists or 404 if not</p>",
    "filename": "./index.js",
    "groupTitle": "ErrorSingle"
  },
  {
    "type": "get",
    "url": "/api/export/:exportid/log",
    "title": "Get Export Log",
    "version": "1.0.0",
    "name": "ExportSingleLog",
    "group": "Export",
    "permission": [
      {
        "name": "user",
        "title": "User",
        "description": "<p>A user must be logged in to use this endpoint</p>"
      }
    ],
    "description": "<p>Return the batch-machine processing log for a given export Note: These are stored in AWS CloudWatch and <em>do</em> expire The presence of a loglink on a export does not guarantee log retention</p>",
    "parameter": {
      "fields": {
        "Parameter": [
          {
            "group": "Parameter",
            "type": "Number",
            "optional": false,
            "field": ":exportid",
            "description": "<p>Export ID</p>"
          }
        ]
      }
    },
    "filename": "./index.js",
    "groupTitle": "Export"
  },
  {
    "type": "post",
    "url": "/api/export",
    "title": "Create Export",
    "version": "1.0.0",
    "name": "CreateExport",
    "group": "Exports",
    "permission": [
      {
        "name": "user",
        "title": "User",
        "description": "<p>A user must be logged in to use this endpoint</p>"
      }
    ],
    "description": "<p>Create a new export task</p>",
    "filename": "./index.js",
    "groupTitle": "Exports"
  },
  {
    "type": "get",
    "url": "/api/export/:exportid/output/export.zip",
    "title": "Get Export Data",
    "version": "1.0.0",
    "name": "DataExport",
    "group": "Exports",
    "permission": [
      {
        "name": "user",
        "title": "User",
        "description": "<p>A user must be logged in to use this endpoint</p>"
      }
    ],
    "description": "<p>Download the data created in an export</p>",
    "parameter": {
      "fields": {
        "Parameter": [
          {
            "group": "Parameter",
            "type": "Number",
            "optional": false,
            "field": ":exportid",
            "description": "<p>Export ID</p>"
          }
        ]
      }
    },
    "filename": "./index.js",
    "groupTitle": "Exports"
  },
  {
    "type": "get",
    "url": "/api/export/:export",
    "title": "Get Export",
    "version": "1.0.0",
    "name": "GetExport",
    "group": "Exports",
    "permission": [
      {
        "name": "user",
        "title": "User",
        "description": "<p>A user must be logged in to use this endpoint</p>"
      }
    ],
    "description": "<p>Get a single export</p>",
    "filename": "./index.js",
    "groupTitle": "Exports"
  },
  {
    "type": "get",
    "url": "/api/export",
    "title": "List Export",
    "version": "1.0.0",
    "name": "ListExport",
    "group": "Exports",
    "permission": [
      {
        "name": "user",
        "title": "User",
        "description": "<p>A user must be logged in to use this endpoint</p>"
      }
    ],
    "description": "<p>List existing exports</p>",
    "filename": "./index.js",
    "groupTitle": "Exports"
  },
  {
    "type": "patch",
    "url": "/api/export/:export",
    "title": "Patch Export",
    "version": "1.0.0",
    "name": "PatchExport",
    "group": "Exports",
    "permission": [
      {
        "name": "admin",
        "title": "Admin",
        "description": "<p>The user must be an admin to use this endpoint</p>"
      }
    ],
    "description": "<p>Update a single export</p>",
    "filename": "./index.js",
    "groupTitle": "Exports"
  },
  {
    "type": "get",
    "url": "/api/job/error/count",
    "title": "Job Error Count",
    "version": "1.0.0",
    "name": "ErrorCount",
    "group": "JobError",
    "permission": [
      {
        "name": "public",
        "title": "Public",
        "description": "<p>This API endpoint does not require authentication</p>"
      }
    ],
    "description": "<p>Return a simple count of the current number of job errors</p>",
    "filename": "./index.js",
    "groupTitle": "JobError"
  },
  {
    "type": "post",
    "url": "/api/job/error",
    "title": "Create Job Error",
    "version": "1.0.0",
    "name": "ErrorCreate",
    "group": "JobError",
    "permission": [
      {
        "name": "admin",
        "title": "Admin",
        "description": "<p>The user must be an admin to use this endpoint</p>"
      }
    ],
    "description": "<p>Create a new Job Error in response to a live job that Failed or Warned</p>",
    "parameter": {
      "fields": {
        "Parameter": [
          {
            "group": "Parameter",
            "type": "Number",
            "optional": false,
            "field": "job",
            "description": "<p>Job ID of the given error</p>"
          },
          {
            "group": "Parameter",
            "type": "String",
            "optional": false,
            "field": "message",
            "description": "<p>Text representation of the error</p>"
          }
        ]
      }
    },
    "filename": "./index.js",
    "groupTitle": "JobError"
  },
  {
    "type": "post",
    "url": "/api/job/error/:job",
    "title": "Resolve Job Error",
    "version": "1.0.0",
    "name": "ErrorModerate",
    "group": "JobError",
    "permission": [
      {
        "name": "admin",
        "title": "Admin",
        "description": "<p>The user must be an admin to use this endpoint</p>"
      }
    ],
    "description": "<p>Mark a job error as resolved</p>",
    "parameter": {
      "fields": {
        "Parameter": [
          {
            "group": "Parameter",
            "type": "Number",
            "optional": false,
            "field": ":job",
            "description": "<p>Job ID</p>"
          }
        ]
      }
    },
    "filename": "./index.js",
    "groupTitle": "JobError"
  },
  {
    "type": "get",
    "url": "/api/job/error",
    "title": "Get Job Errors",
    "version": "1.0.0",
    "name": "ErrorList",
    "group": "JobErrors",
    "permission": [
      {
        "name": "public",
        "title": "Public",
        "description": "<p>This API endpoint does not require authentication</p>"
      }
    ],
    "description": "<p>All jobs that fail as part of a live run are entered into the JobError API This API powers a page that allows for human review of failing jobs Note: Job Errors are cleared with every subsequent full cache</p>",
    "filename": "./index.js",
    "groupTitle": "JobErrors"
  },
  {
    "type": "patch",
    "url": "/api/job/:job",
    "title": "Update Job",
    "version": "1.0.0",
    "name": "JobPatch",
    "group": "Job",
    "permission": [
      {
        "name": "admin",
        "title": "Admin",
        "description": "<p>The user must be an admin to use this endpoint</p>"
      }
    ],
    "description": "<p>Update a job</p>",
    "parameter": {
      "fields": {
        "Parameter": [
          {
            "group": "Parameter",
            "type": "Number",
            "optional": false,
            "field": ":job",
            "description": "<p>Job ID</p>"
          }
        ]
      }
    },
    "filename": "./index.js",
    "groupTitle": "Job"
  },
  {
    "type": "post",
    "url": "/api/job/:job",
    "title": "Rerun Job",
    "version": "1.0.0",
    "name": "JobRerun",
    "group": "Job",
    "permission": [
      {
        "name": "admin",
        "title": "Admin",
        "description": "<p>The user must be an admin to use this endpoint</p>"
      }
    ],
    "description": "<p>Submit a job for reprocessing - often useful for network errors</p>",
    "parameter": {
      "fields": {
        "Parameter": [
          {
            "group": "Parameter",
            "type": "Number",
            "optional": false,
            "field": ":job",
            "description": "<p>Job ID</p>"
          }
        ]
      }
    },
    "filename": "./index.js",
    "groupTitle": "Job"
  },
  {
    "type": "get",
    "url": "/api/job",
    "title": "List Jobs",
    "version": "1.0.0",
    "name": "ListJobs",
    "group": "Job",
    "permission": [
      {
        "name": "public",
        "title": "Public",
        "description": "<p>This API endpoint does not require authentication</p>"
      }
    ],
    "description": "<p>Return information about a given subset of jobs</p>",
    "filename": "./index.js",
    "groupTitle": "Job"
  },
  {
    "type": "get",
    "url": "/api/job/:job/raw",
    "title": "Raw Source",
    "version": "1.0.0",
    "name": "RawSingle",
    "group": "Job",
    "permission": [
      {
        "name": "public",
        "title": "Public",
        "description": "<p>This API endpoint does not require authentication</p>"
      }
    ],
    "description": "<p>Return the raw source from github - this API is not stable nor will it always return a consistent result</p>",
    "parameter": {
      "fields": {
        "Parameter": [
          {
            "group": "Parameter",
            "type": "Number",
            "optional": false,
            "field": ":job",
            "description": "<p>Job ID</p>"
          }
        ]
      }
    },
    "filename": "./index.js",
    "groupTitle": "Job"
  },
  {
    "type": "get",
    "url": "/api/job/:job/output/sample",
    "title": "Small Sample",
    "version": "1.0.0",
    "name": "SampleData",
    "group": "Job",
    "permission": [
      {
        "name": "public",
        "title": "Public",
        "description": "<p>This API endpoint does not require authentication</p>"
      }
    ],
    "description": "<p>Return an Array containing a sample of the properties</p>",
    "parameter": {
      "fields": {
        "Parameter": [
          {
            "group": "Parameter",
            "type": "Number",
            "optional": false,
            "field": ":job",
            "description": "<p>Job ID</p>"
          }
        ]
      }
    },
    "filename": "./index.js",
    "groupTitle": "Job"
  },
  {
    "type": "get",
    "url": "/api/job/:job",
    "title": "Get Job",
    "version": "1.0.0",
    "name": "Single",
    "group": "Job",
    "permission": [
      {
        "name": "public",
        "title": "Public",
        "description": "<p>This API endpoint does not require authentication</p>"
      }
    ],
    "description": "<p>Return all information about a given job</p>",
    "parameter": {
      "fields": {
        "Parameter": [
          {
            "group": "Parameter",
            "type": "Number",
            "optional": false,
            "field": ":job",
            "description": "<p>Job ID</p>"
          }
        ]
      }
    },
    "filename": "./index.js",
    "groupTitle": "Job"
  },
  {
    "type": "get",
    "url": "/api/job/:job/delta",
    "title": "Job Stats Comparison",
    "version": "1.0.0",
    "name": "SingleDelta",
    "group": "Job",
    "permission": [
      {
        "name": "public",
        "title": "Public",
        "description": "<p>This API endpoint does not require authentication</p>"
      }
    ],
    "description": "<p>Compare the stats of the given job against the current live data job</p>",
    "parameter": {
      "fields": {
        "Parameter": [
          {
            "group": "Parameter",
            "type": "Number",
            "optional": false,
            "field": ":job",
            "description": "<p>Job ID</p>"
          }
        ]
      }
    },
    "filename": "./index.js",
    "groupTitle": "Job"
  },
  {
    "type": "get",
    "url": "/api/job/:job/log",
    "title": "Get Job Log",
    "version": "1.0.0",
    "name": "SingleLog",
    "group": "Job",
    "permission": [
      {
        "name": "public",
        "title": "Public",
        "description": "<p>This API endpoint does not require authentication</p>"
      }
    ],
    "description": "<p>Return the batch-machine processing log for a given job Note: These are stored in AWS CloudWatch and <em>do</em> expire The presence of a loglink on a job, does not guarentree log retention</p>",
    "parameter": {
      "fields": {
        "Parameter": [
          {
            "group": "Parameter",
            "type": "Number",
            "optional": false,
            "field": ":job",
            "description": "<p>Job ID</p>"
          }
        ]
      }
    },
    "filename": "./index.js",
    "groupTitle": "Job"
  },
  {
    "type": "get",
    "url": "/api/job/:job/output/cache.zip",
    "title": "Get Job Cache",
    "version": "1.0.0",
    "name": "SingleOutputCache",
    "group": "Job",
    "permission": [
      {
        "name": "public",
        "title": "Public",
        "description": "<p>This API endpoint does not require authentication</p>"
      }
    ],
    "description": "<p>Note: the user must be authenticated to perform a download. One of our largest costs is S3 egress, authenticated downloads allow us to prevent abuse and keep the project running and the data freetw</p> <p>Faster Downloads? Have AWS? The Jobs, Data, &amp; Collections API all return an <code>s3</code> property which links to a requester pays object on S3. For those that are able, this is the best way to download data.</p> <p>OpenAddresses is entirely funded by volunteers (many of then the developers themselves!) Please consider donating if you are able https://opencollective.com/openaddresses</p>",
    "parameter": {
      "fields": {
        "Parameter": [
          {
            "group": "Parameter",
            "type": "Number",
            "optional": false,
            "field": ":job",
            "description": "<p>Job ID</p>"
          }
        ]
      }
    },
    "filename": "./index.js",
    "groupTitle": "Job"
  },
  {
    "type": "get",
    "url": "/api/job/:job/output/source.geojson.gz",
    "title": "Get Job Data",
    "version": "1.0.0",
    "name": "SingleOutputData",
    "group": "Job",
    "permission": [
      {
        "name": "public",
        "title": "Public",
        "description": "<p>This API endpoint does not require authentication</p>"
      }
    ],
    "description": "<p>Note: the user must be authenticated to perform a download. One of our largest costs is S3 egress, authenticated downloads allow us to prevent abuse and keep the project running and the data freetw</p> <p>Faster Downloads? Have AWS? The Jobs, Data, &amp; Collections API all return an <code>s3</code> property which links to a requester pays object on S3. For those that are able, this is the best way to download data.</p> <p>OpenAddresses is entirely funded by volunteers (many of then the developers themselves!) Please consider donating if you are able https://opencollective.com/openaddresses</p>",
    "parameter": {
      "fields": {
        "Parameter": [
          {
            "group": "Parameter",
            "type": "Number",
            "optional": false,
            "field": ":job",
            "description": "<p>Job ID</p>"
          }
        ]
      }
    },
    "filename": "./index.js",
    "groupTitle": "Job"
  },
  {
    "type": "get",
    "url": "/api/job/:job/output/source.png",
    "title": "Get Job Preview",
    "version": "1.0.0",
    "name": "SingleOutputPreview",
    "group": "Job",
    "permission": [
      {
        "name": "public",
        "title": "Public",
        "description": "<p>This API endpoint does not require authentication</p>"
      }
    ],
    "description": "<p>Return the preview image for a given job</p>",
    "parameter": {
      "fields": {
        "Parameter": [
          {
            "group": "Parameter",
            "type": "Number",
            "optional": false,
            "field": ":job",
            "description": "<p>Job ID</p>"
          }
        ]
      }
    },
    "filename": "./index.js",
    "groupTitle": "Job"
  },
  {
    "type": "post",
    "url": "/api/login",
    "title": "Create Session",
    "version": "1.0.0",
    "name": "CreateLogin",
    "group": "Login",
    "permission": [
      {
        "name": "user",
        "title": "User",
        "description": "<p>A user must be logged in to use this endpoint</p>"
      }
    ],
    "description": "<p>Log a user into the service and create an authenticated cookie</p>",
    "filename": "./index.js",
    "groupTitle": "Login"
  },
  {
    "type": "delete",
    "url": "/api/login",
    "title": "Delete Session",
    "version": "1.0.0",
    "name": "DeleteLogin",
    "group": "Login",
    "permission": [
      {
        "name": "user",
        "title": "User",
        "description": "<p>A user must be logged in to use this endpoint</p>"
      }
    ],
    "description": "<p>Log a user out of the service</p>",
    "filename": "./index.js",
    "groupTitle": "Login"
  },
  {
    "type": "post",
    "url": "/api/login/forgot",
    "title": "Forgot Login",
    "version": "1.0.0",
    "name": "ForgotLogin",
    "group": "Login",
    "permission": [
      {
        "name": "public",
        "title": "Public",
        "description": "<p>This API endpoint does not require authentication</p>"
      }
    ],
    "description": "<p>If a user has forgotten their password, send them a password reset link to their email</p>",
    "filename": "./index.js",
    "groupTitle": "Login"
  },
  {
    "type": "get",
    "url": "/api/login",
    "title": "Session Info",
    "version": "1.0.0",
    "name": "GetLogin",
    "group": "Login",
    "permission": [
      {
        "name": "user",
        "title": "User",
        "description": "<p>A user must be logged in to use this endpoint</p>"
      }
    ],
    "description": "<p>Return information about the currently logged in user</p>",
    "filename": "./index.js",
    "groupTitle": "Login"
  },
  {
    "type": "post",
    "url": "/api/login/reset",
    "title": "Reset Login",
    "version": "1.0.0",
    "name": "ResetLogin",
    "group": "Login",
    "permission": [
      {
        "name": "public",
        "title": "Public",
        "description": "<p>This API endpoint does not require authentication</p>"
      }
    ],
    "description": "<p>Once a user has obtained a password reset by email via the Forgot Login API, use the token to reset the password</p>",
    "filename": "./index.js",
    "groupTitle": "Login"
  },
  {
    "type": "post",
    "url": "/api/login/verify",
    "title": "Verify User",
    "version": "1.0.0",
    "name": "VerifyLogin",
    "group": "Login",
    "permission": [
      {
        "name": "public",
        "title": "Public",
        "description": "<p>This API endpoint does not require authentication</p>"
      }
    ],
    "description": "<p>Email Verification of new user</p>",
    "filename": "./index.js",
    "groupTitle": "Login"
  },
  {
    "type": "post",
    "url": "/api/run",
    "title": "Create Run",
    "version": "1.0.0",
    "name": "CreateRun",
    "group": "Run",
    "permission": [
      {
        "name": "admin",
        "title": "Admin",
        "description": "<p>The user must be an admin to use this endpoint</p>"
      }
    ],
    "description": "<p>Create a new run to hold a batch of jobs</p>",
    "filename": "./index.js",
    "groupTitle": "Run"
  },
  {
    "type": "get",
    "url": "/api/run",
    "title": "List Runs",
    "version": "1.0.0",
    "name": "ListRuns",
    "group": "Run",
    "permission": [
      {
        "name": "public",
        "title": "Public",
        "description": "<p>This API endpoint does not require authentication</p>"
      }
    ],
    "description": "<p>Runs are container objects that contain jobs that were started at the same time or by the same process</p>",
    "parameter": {
      "fields": {
        "Parameter": [
          {
            "group": "Parameter",
            "type": "Number",
            "optional": false,
            "field": ":data",
            "description": "<p>Data ID</p>"
          }
        ]
      }
    },
    "filename": "./index.js",
    "groupTitle": "Run"
  },
  {
    "type": "get",
    "url": "/api/run/:run/count",
    "title": "Run Stats",
    "version": "1.0.0",
    "name": "RunStats",
    "group": "Run",
    "permission": [
      {
        "name": "public",
        "title": "Public",
        "description": "<p>This API endpoint does not require authentication</p>"
      }
    ],
    "description": "<p>Return statistics about jobs within a given run</p>",
    "parameter": {
      "fields": {
        "Parameter": [
          {
            "group": "Parameter",
            "type": "Number",
            "optional": false,
            "field": ":run",
            "description": "<p>Run ID</p>"
          }
        ]
      }
    },
    "filename": "./index.js",
    "groupTitle": "Run"
  },
  {
    "type": "get",
    "url": "/api/run/:run",
    "title": "Get Run",
    "version": "1.0.0",
    "name": "Single",
    "group": "Run",
    "permission": [
      {
        "name": "public",
        "title": "Public",
        "description": "<p>This API endpoint does not require authentication</p>"
      }
    ],
    "parameter": {
      "fields": {
        "Parameter": [
          {
            "group": "Parameter",
            "type": "Number",
            "optional": false,
            "field": ":run",
            "description": "<p>Run ID</p>"
          }
        ]
      }
    },
    "filename": "./index.js",
    "groupTitle": "Run"
  },
  {
    "type": "get",
    "url": "/api/run/:run/jobs",
    "title": "List Run Jobs",
    "version": "1.0.0",
    "name": "SingleJobs",
    "group": "Run",
    "permission": [
      {
        "name": "public",
        "title": "Public",
        "description": "<p>This API endpoint does not require authentication</p>"
      }
    ],
    "description": "<p>Return all jobs for a given run</p>",
    "parameter": {
      "fields": {
        "Parameter": [
          {
            "group": "Parameter",
            "type": "Number",
            "optional": false,
            "field": ":run",
            "description": "<p>Run ID</p>"
          }
        ]
      }
    },
    "filename": "./index.js",
    "groupTitle": "Run"
  },
  {
    "type": "post",
    "url": "/api/run/:run/jobs",
    "title": "Populate Run Jobs",
    "version": "1.0.0",
    "name": "SingleJobsCreate",
    "group": "Run",
    "permission": [
      {
        "name": "admin",
        "title": "Admin",
        "description": "<p>The user must be an admin to use this endpoint</p>"
      }
    ],
    "description": "<p>Given an array sources, explode it into multiple jobs and submit to batch or pass in a predefined list of sources/layer/names</p> <pre><code>Note: once jobs are attached to a run, the run is &quot;closed&quot; and subsequent jobs cannot be attached to it</code></pre>",
    "parameter": {
      "fields": {
        "Parameter": [
          {
            "group": "Parameter",
            "type": "Number",
            "optional": false,
            "field": ":run",
            "description": "<p>Run ID</p>"
          }
        ]
      }
    },
    "filename": "./index.js",
    "groupTitle": "Run"
  },
  {
    "type": "patch",
    "url": "/api/run/:run",
    "title": "Update Run",
    "version": "1.0.0",
    "name": "Update",
    "group": "Run",
    "permission": [
      {
        "name": "public",
        "title": "Public",
        "description": "<p>This API endpoint does not require authentication</p>"
      }
    ],
    "description": "<p>Update an existing run</p>",
    "parameter": {
      "fields": {
        "Parameter": [
          {
            "group": "Parameter",
            "type": "Number",
            "optional": false,
            "field": ":run",
            "description": "<p>Run ID</p>"
          }
        ]
      }
    },
    "filename": "./index.js",
    "groupTitle": "Run"
  },
  {
    "type": "post",
    "url": "/api/schedule",
    "title": "Scheduled Event",
    "version": "1.0.0",
    "name": "Schedule",
    "group": "Schedule",
    "permission": [
      {
        "name": "admin",
        "title": "Admin",
        "description": "<p>The user must be an admin to use this endpoint</p>"
      }
    ],
    "description": "<p>Internal function to allow scheduled lambdas to kick off events</p>",
    "filename": "./index.js",
    "groupTitle": "Schedule"
  },
  {
    "type": "get",
    "url": "/health",
    "title": "Server Healthcheck",
    "version": "1.0.0",
    "name": "Health",
    "group": "Server",
    "permission": [
      {
        "name": "public",
        "title": "Public",
        "description": "<p>This API endpoint does not require authentication</p>"
      }
    ],
    "description": "<p>AWS ELB Healthcheck for the server</p>",
    "success": {
      "fields": {
        "Success 200": [
          {
            "group": "Success 200",
            "type": "Boolean",
            "optional": false,
            "field": "healthy",
            "description": "<p>Is the service healthy?</p>"
          },
          {
            "group": "Success 200",
            "type": "String",
            "optional": false,
            "field": "message",
            "description": "<p>The service on how it is doing</p>"
          }
        ]
      }
    },
    "filename": "./index.js",
    "groupTitle": "Server"
  },
  {
    "type": "get",
    "url": "/api",
    "title": "Get Metadata",
    "version": "1.0.0",
    "name": "Meta",
    "group": "Server",
    "permission": [
      {
        "name": "public",
        "title": "Public",
        "description": "<p>This API endpoint does not require authentication</p>"
      }
    ],
    "description": "<p>Return basic metadata about server configuration</p>",
    "success": {
      "fields": {
        "Success 200": [
          {
            "group": "Success 200",
            "type": "String",
            "optional": false,
            "field": "version",
            "description": "<p>The version of the API</p>"
          }
        ]
      }
    },
    "filename": "./index.js",
    "groupTitle": "Server"
  },
  {
    "type": "post",
    "url": "/api/token",
    "title": "Create Token",
    "version": "1.0.0",
    "name": "CreateToken",
    "group": "Token",
    "permission": [
      {
        "name": "user",
        "title": "User",
        "description": "<p>A user must be logged in to use this endpoint</p>"
      }
    ],
    "description": "<p>Create a new API token for programatic access</p>",
    "filename": "./index.js",
    "groupTitle": "Token"
  },
  {
    "type": "delete",
    "url": "/api/token/:id",
    "title": "Delete Token",
    "version": "1.0.0",
    "name": "DeleteToken",
    "group": "Token",
    "permission": [
      {
        "name": "user",
        "title": "User",
        "description": "<p>A user must be logged in to use this endpoint</p>"
      }
    ],
    "description": "<p>Delete a user's API Token</p>",
    "filename": "./index.js",
    "groupTitle": "Token"
  },
  {
    "type": "get",
    "url": "/api/token",
    "title": "List Tokens",
    "version": "1.0.0",
    "name": "ListTokens",
    "group": "Token",
    "permission": [
      {
        "name": "user",
        "title": "User",
        "description": "<p>A user must be logged in to use this endpoint</p>"
      }
    ],
    "description": "<p>List all tokens associated with the requester's account</p>",
    "filename": "./index.js",
    "groupTitle": "Token"
  },
  {
    "type": "post",
    "url": "/api/upload",
    "title": "Create Upload",
    "version": "1.0.0",
    "name": "upload",
    "group": "Upload",
    "permission": [
      {
        "name": "upload",
        "title": "Upload",
        "description": "<p>The user must be an admin or have the &quot;upload&quot; flag enabled on their account</p>"
      }
    ],
    "description": "<p>Statically cache source data</p> <pre><code>If a source is unable to be pulled from directly, authenticated users can cache data resources to the OpenAddresses S3 cache to be pulled from</code></pre>",
    "filename": "./index.js",
    "groupTitle": "Upload"
  },
  {
    "type": "post",
    "url": "/api/user",
    "title": "Create User",
    "version": "1.0.0",
    "name": "CreateUser",
    "group": "User",
    "permission": [
      {
        "name": "public",
        "title": "Public",
        "description": "<p>This API endpoint does not require authentication</p>"
      }
    ],
    "description": "<p>Create a new user</p>",
    "filename": "./index.js",
    "groupTitle": "User"
  },
  {
    "type": "get",
    "url": "/api/user",
    "title": "List Users",
    "version": "1.0.0",
    "name": "ListUsers",
    "group": "User",
    "permission": [
      {
        "name": "admin",
        "title": "Admin",
        "description": "<p>The user must be an admin to use this endpoint</p>"
      }
    ],
    "description": "<p>Return a list of users that have registered with the service</p>",
    "filename": "./index.js",
    "groupTitle": "User"
  },
  {
    "type": "patch",
    "url": "/api/user/:id",
    "title": "Update User",
    "version": "1.0.0",
    "name": "PatchUser",
    "group": "User",
    "permission": [
      {
        "name": "admin",
        "title": "Admin",
        "description": "<p>The user must be an admin to use this endpoint</p>"
      }
    ],
    "description": "<p>Update information about a given user</p>",
    "parameter": {
      "fields": {
        "Parameter": [
          {
            "group": "Parameter",
            "type": "Number",
            "optional": false,
            "field": ":id",
            "description": "<p>The UID of the user to update</p>"
          }
        ]
      }
    },
    "filename": "./index.js",
    "groupTitle": "User"
  },
  {
    "type": "get",
    "url": "/api/user/:id",
    "title": "Single User",
    "version": "1.0.0",
    "name": "SingleUser",
    "group": "User",
    "permission": [
      {
        "name": "admin",
        "title": "Admin",
        "description": "<p>The user must be an admin to use this endpoint</p>"
      }
    ],
    "description": "<p>Get all info about a single user</p>",
    "parameter": {
      "fields": {
        "Parameter": [
          {
            "group": "Parameter",
            "type": "Number",
            "optional": false,
            "field": ":id",
            "description": "<p>The UID of the user to update</p>"
          }
        ]
      }
    },
    "filename": "./index.js",
    "groupTitle": "User"
  },
  {
    "type": "post",
    "url": "/api/github/event",
    "title": "Github Webhook",
    "version": "1.0.0",
    "name": "Github",
    "group": "Webhooks",
    "permission": [
      {
        "name": "admin",
        "title": "Admin",
        "description": "<p>The user must be an admin to use this endpoint</p>"
      }
    ],
    "description": "<p>Callback endpoint for GitHub Webhooks. Should not be called by user functions</p>",
    "filename": "./index.js",
    "groupTitle": "Webhooks"
  },
  {
    "type": "post",
    "url": "/api/opencollective/event",
    "title": "OpenCollective",
    "version": "1.0.0",
    "name": "OpenCollective",
    "group": "Webhooks",
    "permission": [
      {
        "name": "admin",
        "title": "Admin",
        "description": "<p>The user must be an admin to use this endpoint</p>"
      }
    ],
    "description": "<p>Callback endpoint for OpenCollective. Should not be called by user functions</p>",
    "filename": "./index.js",
    "groupTitle": "Webhooks"
  }
] });
