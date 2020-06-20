define({ "api": [
  {
    "type": "post",
    "url": "/api/collections",
    "title": "Create Collection",
    "version": "1.0.0",
    "name": "Create",
    "group": "Collections",
    "permission": [
      {
        "name": "admin",
        "title": "Admin",
        "description": "<p>The user must be an admin to use this endpoint</p>"
      }
    ],
    "filename": "./index.js",
    "groupTitle": "Collections"
  },
  {
    "type": "get",
    "url": "/api/collections/:collection/data",
    "title": "Get data for a given collection",
    "version": "1.0.0",
    "name": "Data",
    "group": "Collections",
    "permission": [
      {
        "name": "public",
        "title": "Public",
        "description": "<p>This API endpoint does not require authentication</p>"
      }
    ],
    "filename": "./index.js",
    "groupTitle": "Collections"
  },
  {
    "type": "delete",
    "url": "/api/collections/:collection",
    "title": "Delete Collection",
    "version": "1.0.0",
    "name": "Delete",
    "group": "Collections",
    "permission": [
      {
        "name": "admin",
        "title": "Admin",
        "description": "<p>The user must be an admin to use this endpoint</p>"
      }
    ],
    "filename": "./index.js",
    "groupTitle": "Collections"
  },
  {
    "type": "get",
    "url": "/api/collections",
    "title": "List data collections",
    "version": "1.0.0",
    "name": "List",
    "group": "Collections",
    "permission": [
      {
        "name": "public",
        "title": "Public",
        "description": "<p>This API endpoint does not require authentication</p>"
      }
    ],
    "filename": "./index.js",
    "groupTitle": "Collections"
  },
  {
    "type": "patch",
    "url": "/api/collections/:collection",
    "title": "Update Collection",
    "version": "1.0.0",
    "name": "Update",
    "group": "Collections",
    "permission": [
      {
        "name": "admin",
        "title": "Admin",
        "description": "<p>The user must be an admin to use this endpoint</p>"
      }
    ],
    "filename": "./index.js",
    "groupTitle": "Collections"
  },
  {
    "type": "get",
    "url": "/api/data",
    "title": "Search for processed data",
    "version": "1.0.0",
    "name": "List",
    "group": "Data",
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
            "type": "String",
            "optional": true,
            "field": "source",
            "description": "<p>Filter results by source name</p>"
          },
          {
            "group": "Parameter",
            "type": "String",
            "optional": true,
            "field": "layer",
            "description": "<p>Filter results by layer type</p>"
          },
          {
            "group": "Parameter",
            "type": "String",
            "optional": true,
            "field": "name",
            "description": "<p>Filter results by layer name</p>"
          },
          {
            "group": "Parameter",
            "type": "String",
            "optional": true,
            "field": "point",
            "description": "<p>Filter results by geographic point</p>"
          }
        ]
      },
      "examples": [
        {
          "title": "?source",
          "content": "?source=\"us/ca\"",
          "type": "String"
        },
        {
          "title": "?layer",
          "content": "?layer=\"addresses\"",
          "type": "String"
        },
        {
          "title": "?name",
          "content": "?name=\"city\"",
          "type": "String"
        },
        {
          "title": "?point",
          "content": "?point=\"<lng>,<lat>\"",
          "type": "String"
        }
      ]
    },
    "filename": "./index.js",
    "groupTitle": "Data"
  },
  {
    "type": "get",
    "url": "/api/data/:data",
    "title": "Get data by data ID",
    "version": "1.0.0",
    "name": "Single",
    "group": "Data",
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
            "field": "data",
            "description": "<p>Data ID</p>"
          }
        ]
      }
    },
    "filename": "./index.js",
    "groupTitle": "Data"
  },
  {
    "type": "get",
    "url": "/api/data/:data/history",
    "title": "Return full job history for a given data ID",
    "version": "1.0.0",
    "name": "SingleHistory",
    "group": "Data",
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
            "field": "data",
            "description": "<p>Data ID</p>"
          }
        ]
      }
    },
    "filename": "./index.js",
    "groupTitle": "Data"
  },
  {
    "type": "post",
    "url": "/api/github/event",
    "title": "Github APP event webhook",
    "version": "1.0.0",
    "name": "Event",
    "group": "Github",
    "permission": [
      {
        "name": "admin",
        "title": "Admin",
        "description": "<p>The user must be an admin to use this endpoint</p>"
      }
    ],
    "filename": "./index.js",
    "groupTitle": "Github"
  },
  {
    "type": "get",
    "url": "/api/job/errors",
    "title": "Search for job runs with recent errors",
    "version": "1.0.0",
    "name": "ErrorsList",
    "group": "Job",
    "permission": [
      {
        "name": "public",
        "title": "Public",
        "description": "<p>This API endpoint does not require authentication</p>"
      }
    ],
    "filename": "./index.js",
    "groupTitle": "Job"
  },
  {
    "type": "patch",
    "url": "/api/job/:job",
    "title": "Update a given job",
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
    "parameter": {
      "fields": {
        "Parameter": [
          {
            "group": "Parameter",
            "type": "Number",
            "optional": false,
            "field": "job",
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
    "title": "Search for job runs",
    "version": "1.0.0",
    "name": "List",
    "group": "Job",
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
            "optional": true,
            "field": "limit",
            "defaultValue": "100",
            "description": "<p>Limit number of returned jobs</p>"
          },
          {
            "group": "Parameter",
            "type": "Number",
            "optional": true,
            "field": "run",
            "description": "<p>Only show job associated with a given ID</p>"
          },
          {
            "group": "Parameter",
            "type": "String",
            "optional": true,
            "field": "status",
            "defaultValue": "Success,Fail,Pending,Warn",
            "description": "<p>Only show job with one of the given statuses</p>"
          },
          {
            "group": "Parameter",
            "type": "String",
            "optional": true,
            "field": "live",
            "defaultValue": "All",
            "description": "<p>Only show jobs associated with a live run</p>"
          },
          {
            "group": "Parameter",
            "type": "String",
            "optional": true,
            "field": "before",
            "defaultValue": "",
            "description": "<p>Only show jobs before the given date</p>"
          },
          {
            "group": "Parameter",
            "type": "String",
            "optional": true,
            "field": "after",
            "defaultValue": "",
            "description": "<p>Only show jobs after the given date</p>"
          }
        ]
      },
      "examples": [
        {
          "title": "?limit",
          "content": "?limit=12",
          "type": "String"
        },
        {
          "title": "?run",
          "content": "?run=12",
          "type": "String"
        },
        {
          "title": "?status",
          "content": "?status=Warn\n?status=Warn,Pending\n?status=Success,Fail,Pending,Warn",
          "type": "String"
        },
        {
          "title": "?env",
          "content": "?env=true\n?env=false",
          "type": "String"
        },
        {
          "title": "?before",
          "content": "?before=2020-01-01\n?before=2020-12-01",
          "type": "String"
        },
        {
          "title": "?after",
          "content": "?after=2020-01-01\n?after=2020-12-01",
          "type": "String"
        }
      ]
    },
    "filename": "./index.js",
    "groupTitle": "Job"
  },
  {
    "type": "get",
    "url": "/api/job/:job",
    "title": "Get a given job by id",
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
    "parameter": {
      "fields": {
        "Parameter": [
          {
            "group": "Parameter",
            "type": "Number",
            "optional": false,
            "field": "job",
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
    "parameter": {
      "fields": {
        "Parameter": [
          {
            "group": "Parameter",
            "type": "Number",
            "optional": false,
            "field": "job",
            "description": "<p>Job ID</p>"
          }
        ]
      }
    },
    "description": "<p>Compare the stats of the given job against the current live data job</p>",
    "filename": "./index.js",
    "groupTitle": "Job"
  },
  {
    "type": "get",
    "url": "/api/job/:job/log",
    "title": "Get the log file for a given job",
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
    "parameter": {
      "fields": {
        "Parameter": [
          {
            "group": "Parameter",
            "type": "Number",
            "optional": false,
            "field": "job",
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
    "title": "Get the raw unprocessed data for a given job",
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
    "parameter": {
      "fields": {
        "Parameter": [
          {
            "group": "Parameter",
            "type": "Number",
            "optional": false,
            "field": "job",
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
    "title": "Get the raw data for a given job",
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
    "parameter": {
      "fields": {
        "Parameter": [
          {
            "group": "Parameter",
            "type": "Number",
            "optional": false,
            "field": "job",
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
    "title": "Get the preview image for a given job",
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
    "parameter": {
      "fields": {
        "Parameter": [
          {
            "group": "Parameter",
            "type": "Number",
            "optional": false,
            "field": "job",
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
    "url": "/api/login",
    "title": "If the user has an active session, reauthenticate the frontend",
    "version": "1.0.0",
    "name": "get",
    "group": "Login",
    "permission": [
      {
        "name": "user",
        "title": "User",
        "description": "<p>A user must be logged in to use this endpoint</p>"
      }
    ],
    "filename": "./index.js",
    "groupTitle": "Login"
  },
  {
    "type": "post",
    "url": "/api/login",
    "title": "Get auth cookies for a given session",
    "version": "1.0.0",
    "name": "login",
    "group": "Login",
    "permission": [
      {
        "name": "user",
        "title": "User",
        "description": "<p>A user must be logged in to use this endpoint</p>"
      }
    ],
    "filename": "./index.js",
    "groupTitle": "Login"
  },
  {
    "type": "get",
    "url": "/api/map",
    "title": "Return a TileJSON document for data coverage layers",
    "version": "1.0.0",
    "name": "TileJSON",
    "group": "Map",
    "permission": [
      {
        "name": "public",
        "title": "Public",
        "description": "<p>This API endpoint does not require authentication</p>"
      }
    ],
    "filename": "./index.js",
    "groupTitle": "Map"
  },
  {
    "type": "get",
    "url": "/api/map/:z/:x/:y.mvt",
    "title": "Return a given Mapbox Vector Tile",
    "version": "1.0.0",
    "name": "VectorTile",
    "group": "Map",
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
            "field": "z",
            "description": "<p>Z coordinate</p>"
          },
          {
            "group": "Parameter",
            "type": "Number",
            "optional": false,
            "field": "x",
            "description": "<p>X coordinate</p>"
          },
          {
            "group": "Parameter",
            "type": "Number",
            "optional": false,
            "field": "y",
            "description": "<p>Y coordinate</p>"
          }
        ]
      }
    },
    "filename": "./index.js",
    "groupTitle": "Map"
  },
  {
    "type": "post",
    "url": "/api/run",
    "title": "Create a new run for a set of jobs",
    "version": "1.0.0",
    "name": "Create",
    "group": "Run",
    "permission": [
      {
        "name": "admin",
        "title": "Admin",
        "description": "<p>The user must be an admin to use this endpoint</p>"
      }
    ],
    "filename": "./index.js",
    "groupTitle": "Run"
  },
  {
    "type": "get",
    "url": "/api/run",
    "title": "Search for data runs",
    "version": "1.0.0",
    "name": "List",
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
            "optional": true,
            "field": "limit",
            "defaultValue": "100",
            "description": "<p>Limit number of returned runs</p>"
          },
          {
            "group": "Parameter",
            "type": "Number",
            "optional": true,
            "field": "run",
            "description": "<p>Only show run associated with a given ID</p>"
          }
        ]
      },
      "examples": [
        {
          "title": "?limit",
          "content": "?limit=12",
          "type": "String"
        },
        {
          "title": "?run",
          "content": "?run=12",
          "type": "String"
        }
      ]
    },
    "filename": "./index.js",
    "groupTitle": "Run"
  },
  {
    "type": "get",
    "url": "/api/run/:run",
    "title": "Get a specific run",
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
            "field": "run",
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
    "title": "Update a specific run",
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
            "field": "run",
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
    "title": "Get jobs for a given run ID",
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
    "parameter": {
      "fields": {
        "Parameter": [
          {
            "group": "Parameter",
            "type": "Number",
            "optional": false,
            "field": "run",
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
    "title": "Populate a created run with jobs",
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
            "field": "run",
            "description": "<p>Run ID</p>"
          },
          {
            "group": "Parameter",
            "type": "json",
            "optional": false,
            "field": "body",
            "description": "<p>Jobs to attach to run</p>"
          }
        ]
      },
      "examples": [
        {
          "title": "body",
          "content": "['https://github.com/path_to_source', {\n    \"source\": \"https://github/path_to_source\",\n    \"layer\": \"addresses\",\n    \"name\": \"dcgis\"\n}]",
          "type": "json"
        }
      ]
    },
    "filename": "./index.js",
    "groupTitle": "Run"
  },
  {
    "type": "post",
    "url": "/api/schedule",
    "title": "Kick off the scheduled full rebuild",
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
    "filename": "./index.js",
    "groupTitle": "Schedule"
  },
  {
    "type": "get",
    "url": "/health",
    "title": "Healthcheck endpoint for AWS ELB",
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
    "success": {
      "examples": [
        {
          "title": "Success-Response:",
          "content": "HTTP/1.1 200 OK\n{\n    \"healthy\": true,\n    \"message\": \"I work all day, I work all night to get the open the data!\"\n}",
          "type": "json"
        }
      ]
    },
    "filename": "./index.js",
    "groupTitle": "Server"
  },
  {
    "type": "get",
    "url": "/api",
    "title": "Get API metadata",
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
    "success": {
      "examples": [
        {
          "title": "Success-Response:",
          "content": "HTTP/1.1 200 OK\n{\n    \"version\": \"1.0.0\"\n}",
          "type": "json"
        }
      ]
    },
    "filename": "./index.js",
    "groupTitle": "Server"
  },
  {
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
    "type": "",
    "url": "",
    "filename": "./index.js",
    "groupTitle": "Token"
  },
  {
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
    "type": "",
    "url": "",
    "filename": "./index.js",
    "groupTitle": "Token"
  },
  {
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
    "type": "",
    "url": "",
    "filename": "./index.js",
    "groupTitle": "Token"
  },
  {
    "type": "post",
    "url": "/api/upload",
    "title": "Allow a user to upload a manually maintained data source",
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
    "filename": "./index.js",
    "groupTitle": "Upload"
  },
  {
    "type": "post",
    "url": "/api/health",
    "title": "Create a new user",
    "version": "1.0.0",
    "name": "Create",
    "group": "User",
    "permission": [
      {
        "name": "public",
        "title": "Public",
        "description": "<p>This API endpoint does not require authentication</p>"
      }
    ],
    "filename": "./index.js",
    "groupTitle": "User"
  },
  {
    "type": "get",
    "url": "/api/user",
    "title": "Return a list of all active users",
    "version": "1.0.0",
    "name": "list",
    "group": "User",
    "permission": [
      {
        "name": "admin",
        "title": "Admin",
        "description": "<p>The user must be an admin to use this endpoint</p>"
      }
    ],
    "filename": "./index.js",
    "groupTitle": "User"
  },
  {
    "type": "get",
    "url": "/api/user/me",
    "title": "If the user has an active session, return metadata about the user",
    "version": "1.0.0",
    "name": "self",
    "group": "User",
    "permission": [
      {
        "name": "user",
        "title": "User",
        "description": "<p>A user must be logged in to use this endpoint</p>"
      }
    ],
    "filename": "./index.js",
    "groupTitle": "User"
  },
  {
    "type": "patch",
    "url": "/api/user/:id",
    "title": "Update a user with the given body",
    "version": "1.0.0",
    "name": "self",
    "group": "User",
    "permission": [
      {
        "name": "admin",
        "title": "Admin",
        "description": "<p>The user must be an admin to use this endpoint</p>"
      }
    ],
    "parameter": {
      "fields": {
        "Parameter": [
          {
            "group": "Parameter",
            "type": "Number",
            "optional": false,
            "field": "id",
            "description": "<p>The UID of the user to update</p>"
          }
        ]
      }
    },
    "filename": "./index.js",
    "groupTitle": "User"
  }
] });
