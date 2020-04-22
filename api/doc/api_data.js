define({ "api": [
  {
    "type": "get",
    "url": "/api/data",
    "title": "Search for processed data",
    "version": "1.0.0",
    "name": "List",
    "group": "Data",
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
    "url": "/api/data/:data",
    "title": "Return full job history for a given data ID",
    "version": "1.0.0",
    "name": "SingleHistory",
    "group": "Data",
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
    "url": "/api/job/:job/log",
    "title": "Get the log file for a given job",
    "version": "1.0.0",
    "name": "SingleLog",
    "group": "Job",
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
    "type": "patch",
    "url": "/api/job/:job",
    "title": "Update a given job",
    "version": "1.0.0",
    "name": "SingleLog",
    "group": "Job",
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
    "type": "post",
    "url": "/api/health",
    "title": "Create a new user",
    "version": "1.0.0",
    "name": "Create",
    "group": "User",
    "filename": "./index.js",
    "groupTitle": "User"
  }
] });
