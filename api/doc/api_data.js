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
    "success": {
      "fields": {
        "Success 200": [
          {
            "group": "Success 200",
            "type": "Integer",
            "optional": false,
            "field": "count",
            "description": ""
          },
          {
            "group": "Success 200",
            "type": "String",
            "optional": false,
            "field": "name",
            "description": ""
          }
        ]
      }
    },
    "filename": "./routes/analytics.js",
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
    "success": {
      "fields": {
        "Success 200": [
          {
            "group": "Success 200",
            "type": "Object[]",
            "optional": false,
            "field": "datasets",
            "description": ""
          },
          {
            "group": "Success 200",
            "type": "String",
            "optional": false,
            "field": "datasets.label",
            "description": ""
          },
          {
            "group": "Success 200",
            "type": "Object[]",
            "optional": false,
            "field": "datasets.data",
            "description": ""
          },
          {
            "group": "Success 200",
            "type": "String",
            "optional": false,
            "field": "datasets.data.x",
            "description": ""
          },
          {
            "group": "Success 200",
            "type": "Integer",
            "optional": false,
            "field": "datasets.data.y",
            "description": ""
          }
        ]
      }
    },
    "filename": "./routes/analytics.js",
    "groupTitle": "Analytics"
  },
  {
    "type": "delete",
    "url": "/api/cache",
    "title": "Flush Cache",
    "version": "1.0.0",
    "name": "FlushCache",
    "group": "Cache",
    "permission": [
      {
        "name": "admin",
        "title": "Admin",
        "description": "<p>The user must be an admin to use this endpoint</p>"
      }
    ],
    "description": "<p>Flush the Memcached Cache</p>",
    "success": {
      "fields": {
        "Success 200": [
          {
            "group": "Success 200",
            "type": "Integer",
            "optional": false,
            "field": "status",
            "description": "<p>The HTTP Status Code of the response</p>"
          },
          {
            "group": "Success 200",
            "type": "String",
            "optional": false,
            "field": "message",
            "description": "<p>A human readable status message</p>"
          }
        ]
      }
    },
    "filename": "./routes/cache.js",
    "groupTitle": "Cache"
  },
  {
    "type": "delete",
    "url": "/api/cache/:cache_key",
    "title": "Delete Key",
    "version": "1.0.0",
    "name": "FlushCache",
    "group": "Cache",
    "permission": [
      {
        "name": "admin",
        "title": "Admin",
        "description": "<p>The user must be an admin to use this endpoint</p>"
      }
    ],
    "description": "<p>Flush the Memcached Cache</p>",
    "success": {
      "fields": {
        "Success 200": [
          {
            "group": "Success 200",
            "type": "Integer",
            "optional": false,
            "field": "status",
            "description": "<p>The HTTP Status Code of the response</p>"
          },
          {
            "group": "Success 200",
            "type": "String",
            "optional": false,
            "field": "message",
            "description": "<p>A human readable status message</p>"
          }
        ]
      }
    },
    "filename": "./routes/cache.js",
    "groupTitle": "Cache"
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
    "parameter": {
      "fields": {
        "Body": [
          {
            "group": "Body",
            "type": "String",
            "optional": false,
            "field": "name",
            "description": "<p>Human-Readable name of the collection</p>"
          },
          {
            "group": "Body",
            "type": "String[]",
            "optional": false,
            "field": "sources",
            "description": ""
          },
          {
            "group": "Body",
            "type": "Null/Integer",
            "optional": true,
            "field": "size",
            "description": "<p>The size of the asset in bytes</p>"
          }
        ]
      }
    },
    "success": {
      "fields": {
        "Success 200": [
          {
            "group": "Success 200",
            "type": "Integer",
            "optional": false,
            "field": "id",
            "description": ""
          },
          {
            "group": "Success 200",
            "type": "String",
            "optional": false,
            "field": "name",
            "description": "<p>The name of the collection</p>"
          },
          {
            "group": "Success 200",
            "type": "String[]",
            "optional": false,
            "field": "sources",
            "description": ""
          },
          {
            "group": "Success 200",
            "type": "String",
            "optional": true,
            "field": "s3",
            "description": "<p>Sponsors have access to the direct S3 bucket</p>"
          },
          {
            "group": "Success 200",
            "type": "Integer",
            "optional": false,
            "field": "created",
            "description": "<p>The timestamp at which the resource was created</p>"
          },
          {
            "group": "Success 200",
            "type": "Null/Integer",
            "optional": false,
            "field": "size",
            "description": "<p>The size of the asset in bytes</p>"
          }
        ]
      }
    },
    "filename": "./routes/collection.js",
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
    "filename": "./routes/collection.js",
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
    "success": {
      "fields": {
        "Success 200": [
          {
            "group": "Success 200",
            "type": "Integer",
            "optional": false,
            "field": "status",
            "description": "<p>The HTTP Status Code of the response</p>"
          },
          {
            "group": "Success 200",
            "type": "String",
            "optional": false,
            "field": "message",
            "description": "<p>A human readable status message</p>"
          }
        ]
      }
    },
    "filename": "./routes/collection.js",
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
    "success": {
      "fields": {
        "Success 200": [
          {
            "group": "Success 200",
            "type": "Integer",
            "optional": false,
            "field": "id",
            "description": ""
          },
          {
            "group": "Success 200",
            "type": "Null/Integer",
            "optional": false,
            "field": "size",
            "description": "<p>The size of the asset in bytes</p>"
          },
          {
            "group": "Success 200",
            "type": "String",
            "optional": false,
            "field": "name",
            "description": ""
          },
          {
            "group": "Success 200",
            "type": "Integer",
            "optional": false,
            "field": "created",
            "description": "<p>The timestamp at which the resource was created</p>"
          },
          {
            "group": "Success 200",
            "type": "String",
            "optional": false,
            "field": "s3",
            "description": ""
          },
          {
            "group": "Success 200",
            "type": "Unknown",
            "optional": false,
            "field": "sources",
            "description": ""
          }
        ]
      }
    },
    "filename": "./routes/collection.js",
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
        ],
        "Body": [
          {
            "group": "Body",
            "type": "String",
            "optional": true,
            "field": "name",
            "description": ""
          },
          {
            "group": "Body",
            "type": "String[]",
            "optional": true,
            "field": "sources",
            "description": ""
          },
          {
            "group": "Body",
            "type": "Null/Integer",
            "optional": true,
            "field": "size",
            "description": "<p>The size of the asset in bytes</p>"
          }
        ]
      }
    },
    "success": {
      "fields": {
        "Success 200": [
          {
            "group": "Success 200",
            "type": "Integer",
            "optional": false,
            "field": "id",
            "description": ""
          },
          {
            "group": "Success 200",
            "type": "String",
            "optional": false,
            "field": "name",
            "description": "<p>The name of the collection</p>"
          },
          {
            "group": "Success 200",
            "type": "String[]",
            "optional": false,
            "field": "sources",
            "description": ""
          },
          {
            "group": "Success 200",
            "type": "String",
            "optional": true,
            "field": "s3",
            "description": "<p>Sponsors have access to the direct S3 bucket</p>"
          },
          {
            "group": "Success 200",
            "type": "Integer",
            "optional": false,
            "field": "created",
            "description": "<p>The timestamp at which the resource was created</p>"
          },
          {
            "group": "Success 200",
            "type": "Null/Integer",
            "optional": false,
            "field": "size",
            "description": "<p>The size of the asset in bytes</p>"
          }
        ]
      }
    },
    "filename": "./routes/collection.js",
    "groupTitle": "Collections"
  },
  {
    "type": "get",
    "url": "/api/data",
    "title": "List Data",
    "version": "1.0.0",
    "name": "ListData",
    "group": "Data",
    "permission": [
      {
        "name": "public",
        "title": "Public",
        "description": "<p>This API endpoint does not require authentication</p>"
      }
    ],
    "description": "<p>Get the latest successful run of a given geographic area</p>",
    "parameter": {
      "fields": {
        "Query": [
          {
            "group": "Query",
            "type": "String",
            "optional": true,
            "field": "source",
            "description": "<p>Filter results by source name</p>"
          },
          {
            "group": "Query",
            "type": "String",
            "optional": true,
            "field": "layer",
            "description": "<p>Filter results by layer type</p>"
          },
          {
            "group": "Query",
            "type": "String",
            "optional": true,
            "field": "name",
            "description": "<p>Filter results by layer name</p>"
          },
          {
            "group": "Query",
            "type": "String",
            "optional": true,
            "field": "before",
            "description": "<p>Filter results updated before the given date</p>"
          },
          {
            "group": "Query",
            "type": "String",
            "optional": true,
            "field": "after",
            "description": "<p>Filter results updated after the given date</p>"
          },
          {
            "group": "Query",
            "type": "String",
            "optional": true,
            "field": "point",
            "description": "<p>Filter results by geographic point '{lng},{lat}'</p>"
          },
          {
            "group": "Query",
            "type": "Boolean",
            "optional": true,
            "field": "fabric",
            "description": "<p>Query results by fabric inclusion</p>"
          }
        ]
      }
    },
    "success": {
      "fields": {
        "Success 200": [
          {
            "group": "Success 200",
            "type": "Integer",
            "optional": false,
            "field": "id",
            "description": ""
          },
          {
            "group": "Success 200",
            "type": "Boolean",
            "optional": false,
            "field": "fabric",
            "description": ""
          },
          {
            "group": "Success 200",
            "type": "String",
            "optional": false,
            "field": "source",
            "description": ""
          },
          {
            "group": "Success 200",
            "type": "Integer",
            "optional": false,
            "field": "updated",
            "description": "<p>The timestamp at which the resource was last updated</p>"
          },
          {
            "group": "Success 200",
            "type": "String",
            "optional": false,
            "field": "layer",
            "description": ""
          },
          {
            "group": "Success 200",
            "type": "String",
            "optional": false,
            "field": "name",
            "description": ""
          },
          {
            "group": "Success 200",
            "type": "Integer",
            "optional": false,
            "field": "job",
            "description": ""
          },
          {
            "group": "Success 200",
            "type": "String",
            "optional": true,
            "field": "s3",
            "description": ""
          },
          {
            "group": "Success 200",
            "type": "Null/Integer",
            "optional": false,
            "field": "size",
            "description": "<p>The size of the asset in bytes</p>"
          },
          {
            "group": "Success 200",
            "type": "Object",
            "optional": false,
            "field": "output",
            "description": ""
          },
          {
            "group": "Success 200",
            "type": "Boolean",
            "optional": false,
            "field": "output.cache",
            "description": ""
          },
          {
            "group": "Success 200",
            "type": "Boolean",
            "optional": false,
            "field": "output.output",
            "description": ""
          },
          {
            "group": "Success 200",
            "type": "Boolean",
            "optional": false,
            "field": "output.preview",
            "description": ""
          }
        ]
      }
    },
    "filename": "./routes/data.js",
    "groupTitle": "Data"
  },
  {
    "type": "get",
    "url": "/api/data/:data",
    "title": "Get Data",
    "version": "1.0.0",
    "name": "SingleData",
    "group": "Data",
    "permission": [
      {
        "name": "public",
        "title": "Public",
        "description": "<p>This API endpoint does not require authentication</p>"
      }
    ],
    "description": "<p>Return all information about a specific data segment</p>",
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
    "success": {
      "fields": {
        "Success 200": [
          {
            "group": "Success 200",
            "type": "Integer",
            "optional": false,
            "field": "id",
            "description": ""
          },
          {
            "group": "Success 200",
            "type": "Boolean",
            "optional": false,
            "field": "fabric",
            "description": ""
          },
          {
            "group": "Success 200",
            "type": "String",
            "optional": false,
            "field": "source",
            "description": ""
          },
          {
            "group": "Success 200",
            "type": "Integer",
            "optional": false,
            "field": "updated",
            "description": "<p>The timestamp at which the resource was last updated</p>"
          },
          {
            "group": "Success 200",
            "type": "String",
            "optional": false,
            "field": "layer",
            "description": ""
          },
          {
            "group": "Success 200",
            "type": "String",
            "optional": false,
            "field": "name",
            "description": ""
          },
          {
            "group": "Success 200",
            "type": "Integer",
            "optional": false,
            "field": "job",
            "description": ""
          },
          {
            "group": "Success 200",
            "type": "String",
            "optional": true,
            "field": "s3",
            "description": "<p>Sponsors have access to the direct S3 bucket</p>"
          },
          {
            "group": "Success 200",
            "type": "Null/Integer",
            "optional": false,
            "field": "size",
            "description": "<p>The size of the asset in bytes</p>"
          },
          {
            "group": "Success 200",
            "type": "Object",
            "optional": false,
            "field": "output",
            "description": ""
          },
          {
            "group": "Success 200",
            "type": "Boolean",
            "optional": false,
            "field": "output.cache",
            "description": ""
          },
          {
            "group": "Success 200",
            "type": "Boolean",
            "optional": false,
            "field": "output.output",
            "description": ""
          },
          {
            "group": "Success 200",
            "type": "Boolean",
            "optional": false,
            "field": "output.preview",
            "description": ""
          }
        ]
      }
    },
    "filename": "./routes/data.js",
    "groupTitle": "Data"
  },
  {
    "type": "get",
    "url": "/api/data/:data/history",
    "title": "Return Data History",
    "version": "1.0.0",
    "name": "SingleHistoryData",
    "group": "Data",
    "permission": [
      {
        "name": "public",
        "title": "Public",
        "description": "<p>This API endpoint does not require authentication</p>"
      }
    ],
    "description": "<p>Return the job history for a given data component</p>",
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
    "success": {
      "fields": {
        "Success 200": [
          {
            "group": "Success 200",
            "type": "Integer",
            "optional": false,
            "field": "id",
            "description": ""
          },
          {
            "group": "Success 200",
            "type": "Object[]",
            "optional": false,
            "field": "jobs",
            "description": ""
          },
          {
            "group": "Success 200",
            "type": "Integer",
            "optional": false,
            "field": "jobs.id",
            "description": ""
          },
          {
            "group": "Success 200",
            "type": "Integer",
            "optional": false,
            "field": "jobs.created",
            "description": "<p>The timestamp at which the resource was created</p>"
          },
          {
            "group": "Success 200",
            "type": "String",
            "allowedValues": [
              "\"Pending\"",
              "\"Running\"",
              "\"Success\"",
              "\"Fail\"",
              "\"Warn\""
            ],
            "optional": false,
            "field": "jobs.status",
            "description": "<p>The current status of a given task</p>"
          },
          {
            "group": "Success 200",
            "type": "String",
            "optional": false,
            "field": "jobs.s3",
            "description": ""
          },
          {
            "group": "Success 200",
            "type": "Object",
            "optional": false,
            "field": "jobs.output",
            "description": ""
          },
          {
            "group": "Success 200",
            "type": "Boolean",
            "optional": false,
            "field": "jobs.output.cache",
            "description": ""
          },
          {
            "group": "Success 200",
            "type": "Boolean",
            "optional": false,
            "field": "jobs.output.output",
            "description": ""
          },
          {
            "group": "Success 200",
            "type": "Boolean",
            "optional": false,
            "field": "jobs.output.preview",
            "description": ""
          },
          {
            "group": "Success 200",
            "type": "Integer",
            "optional": false,
            "field": "jobs.count",
            "description": ""
          },
          {
            "group": "Success 200",
            "type": "Object",
            "optional": false,
            "field": "jobs.stats",
            "description": ""
          }
        ]
      }
    },
    "filename": "./routes/data.js",
    "groupTitle": "Data"
  },
  {
    "type": "patch",
    "url": "/api/data/:data",
    "title": "Update Data",
    "version": "1.0.0",
    "name": "Update",
    "group": "Data",
    "permission": [
      {
        "name": "data"
      }
    ],
    "description": "<p>Update an existing data object</p>",
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
        ],
        "Body": [
          {
            "group": "Body",
            "type": "Boolean",
            "optional": true,
            "field": "fabric",
            "description": "<p>Should the source be included in the fabric</p>"
          }
        ]
      }
    },
    "success": {
      "fields": {
        "Success 200": [
          {
            "group": "Success 200",
            "type": "Integer",
            "optional": false,
            "field": "id",
            "description": ""
          },
          {
            "group": "Success 200",
            "type": "Boolean",
            "optional": false,
            "field": "fabric",
            "description": ""
          },
          {
            "group": "Success 200",
            "type": "String",
            "optional": false,
            "field": "source",
            "description": ""
          },
          {
            "group": "Success 200",
            "type": "Integer",
            "optional": false,
            "field": "updated",
            "description": "<p>The timestamp at which the resource was last updated</p>"
          },
          {
            "group": "Success 200",
            "type": "String",
            "optional": false,
            "field": "layer",
            "description": ""
          },
          {
            "group": "Success 200",
            "type": "String",
            "optional": false,
            "field": "name",
            "description": ""
          },
          {
            "group": "Success 200",
            "type": "Integer",
            "optional": false,
            "field": "job",
            "description": ""
          },
          {
            "group": "Success 200",
            "type": "String",
            "optional": true,
            "field": "s3",
            "description": "<p>Sponsors have access to the direct S3 bucket</p>"
          },
          {
            "group": "Success 200",
            "type": "Null/Integer",
            "optional": false,
            "field": "size",
            "description": "<p>The size of the asset in bytes</p>"
          },
          {
            "group": "Success 200",
            "type": "Object",
            "optional": false,
            "field": "output",
            "description": ""
          },
          {
            "group": "Success 200",
            "type": "Boolean",
            "optional": false,
            "field": "output.cache",
            "description": ""
          },
          {
            "group": "Success 200",
            "type": "Boolean",
            "optional": false,
            "field": "output.output",
            "description": ""
          },
          {
            "group": "Success 200",
            "type": "Boolean",
            "optional": false,
            "field": "output.preview",
            "description": ""
          }
        ]
      }
    },
    "filename": "./routes/data.js",
    "groupTitle": "Data"
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
    "success": {
      "fields": {
        "Success 200": [
          {
            "group": "Success 200",
            "type": "Integer",
            "optional": false,
            "field": "id",
            "description": ""
          },
          {
            "group": "Success 200",
            "type": "String",
            "allowedValues": [
              "\"Pending\"",
              "\"Running\"",
              "\"Success\"",
              "\"Fail\"",
              "\"Warn\""
            ],
            "optional": false,
            "field": "status",
            "description": "<p>The current status of a given task</p>"
          },
          {
            "group": "Success 200",
            "type": "String[]",
            "optional": false,
            "field": "messages",
            "description": ""
          },
          {
            "group": "Success 200",
            "type": "String",
            "optional": false,
            "field": "source_name",
            "description": ""
          },
          {
            "group": "Success 200",
            "type": "String",
            "optional": false,
            "field": "layer",
            "description": ""
          },
          {
            "group": "Success 200",
            "type": "String",
            "optional": false,
            "field": "name",
            "description": ""
          }
        ]
      }
    },
    "filename": "./routes/error_job.js",
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
    "success": {
      "fields": {
        "Success 200": [
          {
            "group": "Success 200",
            "type": "Integer",
            "optional": false,
            "field": "id",
            "description": "<p>The linenumber of the log message</p>"
          },
          {
            "group": "Success 200",
            "type": "Integer",
            "optional": false,
            "field": "timestamp",
            "description": "<p>The time at which the particular line was generated</p>"
          },
          {
            "group": "Success 200",
            "type": "String",
            "optional": false,
            "field": "message",
            "description": "<p>The log line itself</p>"
          }
        ]
      }
    },
    "filename": "./routes/export.js",
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
    "parameter": {
      "fields": {
        "Body": [
          {
            "group": "Body",
            "type": "Integer",
            "optional": false,
            "field": "job_id",
            "description": "<p>The Job ID to start an export task for</p>"
          },
          {
            "group": "Body",
            "type": "String",
            "allowedValues": [
              "\"shapefile\"",
              "\"csv\""
            ],
            "optional": false,
            "field": "format",
            "description": "<p>Formats that can be exported to</p>"
          }
        ]
      }
    },
    "success": {
      "fields": {
        "Success 200": [
          {
            "group": "Success 200",
            "type": "Integer",
            "optional": false,
            "field": "id",
            "description": "<p>The integer ID of the export task</p>"
          },
          {
            "group": "Success 200",
            "type": "Integer",
            "optional": false,
            "field": "uid",
            "description": "<p>The User ID that initiated the export task</p>"
          },
          {
            "group": "Success 200",
            "type": "Integer",
            "optional": false,
            "field": "job_id",
            "description": "<p>The Job ID being exported</p>"
          },
          {
            "group": "Success 200",
            "type": "String",
            "allowedValues": [
              "\"shapefile\"",
              "\"csv\""
            ],
            "optional": false,
            "field": "format",
            "description": "<p>Formats that can be exported to</p>"
          },
          {
            "group": "Success 200",
            "type": "Integer",
            "optional": false,
            "field": "created",
            "description": "<p>The timestamp at which the resource was created</p>"
          },
          {
            "group": "Success 200",
            "type": "Integer",
            "optional": false,
            "field": "expiry",
            "description": "<p>The timestamp at which the export will expire</p>"
          },
          {
            "group": "Success 200",
            "type": "Null/Integer",
            "optional": false,
            "field": "size",
            "description": "<p>The size of the asset in bytes</p>"
          },
          {
            "group": "Success 200",
            "type": "String",
            "allowedValues": [
              "\"Pending\"",
              "\"Running\"",
              "\"Success\"",
              "\"Fail\"",
              "\"Warn\""
            ],
            "optional": false,
            "field": "status",
            "description": "<p>The current status of a given task</p>"
          },
          {
            "group": "Success 200",
            "type": "Null/String",
            "optional": false,
            "field": "loglink",
            "description": "<p>The AWS Cloudwatch Log ID of an AWS Batch run - note these logs expire</p>"
          }
        ]
      }
    },
    "filename": "./routes/export.js",
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
    "filename": "./routes/export.js",
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
    "success": {
      "fields": {
        "Success 200": [
          {
            "group": "Success 200",
            "type": "Integer",
            "optional": false,
            "field": "id",
            "description": "<p>The integer ID of the export task</p>"
          },
          {
            "group": "Success 200",
            "type": "Integer",
            "optional": false,
            "field": "uid",
            "description": "<p>The User ID that initiated the export task</p>"
          },
          {
            "group": "Success 200",
            "type": "Integer",
            "optional": false,
            "field": "job_id",
            "description": "<p>The Job ID being exported</p>"
          },
          {
            "group": "Success 200",
            "type": "String",
            "allowedValues": [
              "\"shapefile\"",
              "\"csv\""
            ],
            "optional": false,
            "field": "format",
            "description": "<p>Formats that can be exported to</p>"
          },
          {
            "group": "Success 200",
            "type": "Integer",
            "optional": false,
            "field": "created",
            "description": "<p>The timestamp at which the resource was created</p>"
          },
          {
            "group": "Success 200",
            "type": "Integer",
            "optional": false,
            "field": "expiry",
            "description": "<p>The timestamp at which the export will expire</p>"
          },
          {
            "group": "Success 200",
            "type": "Null/Integer",
            "optional": false,
            "field": "size",
            "description": "<p>The size of the asset in bytes</p>"
          },
          {
            "group": "Success 200",
            "type": "String",
            "allowedValues": [
              "\"Pending\"",
              "\"Running\"",
              "\"Success\"",
              "\"Fail\"",
              "\"Warn\""
            ],
            "optional": false,
            "field": "status",
            "description": "<p>The current status of a given task</p>"
          },
          {
            "group": "Success 200",
            "type": "Null/String",
            "optional": false,
            "field": "loglink",
            "description": "<p>The AWS Cloudwatch Log ID of an AWS Batch run - note these logs expire</p>"
          }
        ]
      }
    },
    "filename": "./routes/export.js",
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
    "parameter": {
      "fields": {
        "Query": [
          {
            "group": "Query",
            "type": "Integer",
            "size": "-∞ - 100",
            "optional": true,
            "field": "limit",
            "defaultValue": "100",
            "description": "<p>Limit number of returned runs</p>"
          },
          {
            "group": "Query",
            "type": "Integer",
            "optional": true,
            "field": "page",
            "description": "<p>Page of results to return</p>"
          },
          {
            "group": "Query",
            "type": "String",
            "allowedValues": [
              "\"Pending\"",
              "\"Running\"",
              "\"Success\"",
              "\"Fail\"",
              "\"Warn\""
            ],
            "optional": true,
            "field": "status",
            "description": "<p>The current status of a given task</p>"
          },
          {
            "group": "Query",
            "type": "String",
            "optional": true,
            "field": "before",
            "description": "<p>Only show runs before the given date</p>"
          },
          {
            "group": "Query",
            "type": "String",
            "optional": true,
            "field": "after",
            "description": "<p>Only show runs after the given date</p>"
          },
          {
            "group": "Query",
            "type": "String",
            "optional": true,
            "field": "uid",
            "description": "<p>The User ID to show exports for - useful for admin only - user's can ownly see their own</p>"
          }
        ]
      }
    },
    "success": {
      "fields": {
        "Success 200": [
          {
            "group": "Success 200",
            "type": "Integer",
            "optional": false,
            "field": "total",
            "description": "<p>The total number of exports in the account</p>"
          },
          {
            "group": "Success 200",
            "type": "Object[]",
            "optional": false,
            "field": "exports",
            "description": ""
          },
          {
            "group": "Success 200",
            "type": "Integer",
            "optional": false,
            "field": "exports.id",
            "description": "<p>The integer ID of the export task</p>"
          },
          {
            "group": "Success 200",
            "type": "Integer",
            "optional": false,
            "field": "exports.uid",
            "description": "<p>The User ID that initiated the export task</p>"
          },
          {
            "group": "Success 200",
            "type": "Integer",
            "optional": false,
            "field": "exports.job_id",
            "description": "<p>The Job ID being exported</p>"
          },
          {
            "group": "Success 200",
            "type": "String",
            "allowedValues": [
              "\"shapefile\"",
              "\"csv\""
            ],
            "optional": false,
            "field": "exports.format",
            "description": "<p>Formats that can be exported to</p>"
          },
          {
            "group": "Success 200",
            "type": "Integer",
            "optional": false,
            "field": "exports.created",
            "description": "<p>The timestamp at which the resource was created</p>"
          },
          {
            "group": "Success 200",
            "type": "Integer",
            "optional": false,
            "field": "exports.expiry",
            "description": "<p>The timestamp at which the export will expire</p>"
          },
          {
            "group": "Success 200",
            "type": "Null/Integer",
            "optional": false,
            "field": "exports.size",
            "description": "<p>The size of the asset in bytes</p>"
          },
          {
            "group": "Success 200",
            "type": "String",
            "allowedValues": [
              "\"Pending\"",
              "\"Running\"",
              "\"Success\"",
              "\"Fail\"",
              "\"Warn\""
            ],
            "optional": false,
            "field": "exports.status",
            "description": "<p>The current status of a given task</p>"
          },
          {
            "group": "Success 200",
            "type": "Null/String",
            "optional": false,
            "field": "exports.loglink",
            "description": "<p>The AWS Cloudwatch Log ID of an AWS Batch run - note these logs expire</p>"
          },
          {
            "group": "Success 200",
            "type": "String",
            "optional": false,
            "field": "exports.source_name",
            "description": ""
          },
          {
            "group": "Success 200",
            "type": "String",
            "optional": false,
            "field": "exports.layer",
            "description": ""
          },
          {
            "group": "Success 200",
            "type": "String",
            "optional": false,
            "field": "exports.name",
            "description": ""
          }
        ]
      }
    },
    "filename": "./routes/export.js",
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
    "parameter": {
      "fields": {
        "Body": [
          {
            "group": "Body",
            "type": "Null/Integer",
            "optional": true,
            "field": "size",
            "description": "<p>The size of the asset in bytes</p>"
          },
          {
            "group": "Body",
            "type": "String",
            "allowedValues": [
              "\"Pending\"",
              "\"Running\"",
              "\"Success\"",
              "\"Fail\"",
              "\"Warn\""
            ],
            "optional": true,
            "field": "status",
            "description": "<p>The current status of a given task</p>"
          },
          {
            "group": "Body",
            "type": "Null/String",
            "optional": true,
            "field": "loglink",
            "description": "<p>The AWS Cloudwatch Log ID of an AWS Batch run - note these logs expire</p>"
          }
        ]
      }
    },
    "success": {
      "fields": {
        "Success 200": [
          {
            "group": "Success 200",
            "type": "Integer",
            "optional": false,
            "field": "id",
            "description": "<p>The integer ID of the export task</p>"
          },
          {
            "group": "Success 200",
            "type": "Integer",
            "optional": false,
            "field": "uid",
            "description": "<p>The User ID that initiated the export task</p>"
          },
          {
            "group": "Success 200",
            "type": "Integer",
            "optional": false,
            "field": "job_id",
            "description": "<p>The Job ID being exported</p>"
          },
          {
            "group": "Success 200",
            "type": "String",
            "allowedValues": [
              "\"shapefile\"",
              "\"csv\""
            ],
            "optional": false,
            "field": "format",
            "description": "<p>Formats that can be exported to</p>"
          },
          {
            "group": "Success 200",
            "type": "Integer",
            "optional": false,
            "field": "created",
            "description": "<p>The timestamp at which the resource was created</p>"
          },
          {
            "group": "Success 200",
            "type": "Integer",
            "optional": false,
            "field": "expiry",
            "description": "<p>The timestamp at which the export will expire</p>"
          },
          {
            "group": "Success 200",
            "type": "Null/Integer",
            "optional": false,
            "field": "size",
            "description": "<p>The size of the asset in bytes</p>"
          },
          {
            "group": "Success 200",
            "type": "String",
            "allowedValues": [
              "\"Pending\"",
              "\"Running\"",
              "\"Success\"",
              "\"Fail\"",
              "\"Warn\""
            ],
            "optional": false,
            "field": "status",
            "description": "<p>The current status of a given task</p>"
          },
          {
            "group": "Success 200",
            "type": "Null/String",
            "optional": false,
            "field": "loglink",
            "description": "<p>The AWS Cloudwatch Log ID of an AWS Batch run - note these logs expire</p>"
          }
        ]
      }
    },
    "filename": "./routes/export.js",
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
    "success": {
      "fields": {
        "Success 200": [
          {
            "group": "Success 200",
            "type": "Integer",
            "optional": false,
            "field": "count",
            "description": ""
          }
        ]
      }
    },
    "filename": "./routes/error_job.js",
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
        ],
        "Body": [
          {
            "group": "Body",
            "type": "Integer",
            "optional": false,
            "field": "job",
            "description": ""
          },
          {
            "group": "Body",
            "type": "String",
            "optional": false,
            "field": "message",
            "description": ""
          }
        ]
      }
    },
    "success": {
      "fields": {
        "Success 200": [
          {
            "group": "Success 200",
            "type": "Integer",
            "optional": false,
            "field": "job",
            "description": "<p>The Job ID of the error</p>"
          },
          {
            "group": "Success 200",
            "type": "String",
            "optional": false,
            "field": "message",
            "description": ""
          }
        ]
      }
    },
    "filename": "./routes/error_job.js",
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
        ],
        "Body": [
          {
            "group": "Body",
            "type": "Integer",
            "optional": false,
            "field": "job",
            "description": ""
          },
          {
            "group": "Body",
            "type": "String",
            "allowedValues": [
              "\"confirm\"",
              "\"reject\""
            ],
            "optional": false,
            "field": "moderate",
            "description": ""
          }
        ]
      }
    },
    "success": {
      "fields": {
        "Success 200": [
          {
            "group": "Success 200",
            "type": "Integer",
            "optional": false,
            "field": "job",
            "description": ""
          },
          {
            "group": "Success 200",
            "type": "String",
            "allowedValues": [
              "\"confirm\"",
              "\"reject\""
            ],
            "optional": false,
            "field": "moderate",
            "description": ""
          }
        ]
      }
    },
    "filename": "./routes/error_job.js",
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
    "success": {
      "fields": {
        "Success 200": [
          {
            "group": "Success 200",
            "type": "Integer",
            "optional": false,
            "field": "id",
            "description": ""
          },
          {
            "group": "Success 200",
            "type": "String",
            "allowedValues": [
              "\"Pending\"",
              "\"Running\"",
              "\"Success\"",
              "\"Fail\"",
              "\"Warn\""
            ],
            "optional": false,
            "field": "status",
            "description": "<p>The current status of a given task</p>"
          },
          {
            "group": "Success 200",
            "type": "String[]",
            "optional": false,
            "field": "messages",
            "description": ""
          },
          {
            "group": "Success 200",
            "type": "String",
            "optional": false,
            "field": "source_name",
            "description": ""
          },
          {
            "group": "Success 200",
            "type": "String",
            "optional": false,
            "field": "layer",
            "description": ""
          },
          {
            "group": "Success 200",
            "type": "String",
            "optional": false,
            "field": "name",
            "description": ""
          }
        ]
      }
    },
    "filename": "./routes/error_job.js",
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
        ],
        "Body": [
          {
            "group": "Body",
            "type": "Null/Integer",
            "optional": true,
            "field": "size",
            "description": "<p>The size of the asset in bytes</p>"
          },
          {
            "group": "Body",
            "type": "Integer",
            "optional": true,
            "field": "map",
            "description": ""
          },
          {
            "group": "Body",
            "type": "Object",
            "optional": true,
            "field": "output",
            "description": ""
          },
          {
            "group": "Body",
            "type": "Null/String",
            "optional": true,
            "field": "loglink",
            "description": "<p>The AWS Cloudwatch Log ID of an AWS Batch run - note these logs expire</p>"
          },
          {
            "group": "Body",
            "type": "String",
            "allowedValues": [
              "\"Pending\"",
              "\"Running\"",
              "\"Success\"",
              "\"Fail\"",
              "\"Warn\""
            ],
            "optional": true,
            "field": "status",
            "description": "<p>The current status of a given task</p>"
          },
          {
            "group": "Body",
            "type": "String",
            "optional": true,
            "field": "version",
            "description": ""
          },
          {
            "group": "Body",
            "type": "Object",
            "optional": true,
            "field": "stats",
            "description": ""
          },
          {
            "group": "Body",
            "type": "Integer",
            "optional": true,
            "field": "count",
            "description": ""
          },
          {
            "group": "Body",
            "type": "Object",
            "optional": true,
            "field": "bounds",
            "description": ""
          },
          {
            "group": "Body",
            "type": "String",
            "allowedValues": [
              "\"Polygon\""
            ],
            "optional": false,
            "field": "bounds.type",
            "description": ""
          },
          {
            "group": "Body",
            "type": "Unknown",
            "optional": false,
            "field": "bounds.coordinates",
            "description": ""
          }
        ]
      }
    },
    "success": {
      "fields": {
        "Success 200": [
          {
            "group": "Success 200",
            "type": "Integer",
            "optional": false,
            "field": "id",
            "description": ""
          },
          {
            "group": "Success 200",
            "type": "Boolean/Object",
            "optional": false,
            "field": "license",
            "description": ""
          },
          {
            "group": "Success 200",
            "type": "Boolean/String",
            "optional": true,
            "field": "s3",
            "description": ""
          },
          {
            "group": "Success 200",
            "type": "Integer",
            "optional": false,
            "field": "run",
            "description": ""
          },
          {
            "group": "Success 200",
            "type": "Null/Integer",
            "optional": false,
            "field": "map",
            "description": ""
          },
          {
            "group": "Success 200",
            "type": "Integer",
            "optional": false,
            "field": "created",
            "description": "<p>The timestamp at which the resource was created</p>"
          },
          {
            "group": "Success 200",
            "type": "String",
            "optional": false,
            "field": "source",
            "description": ""
          },
          {
            "group": "Success 200",
            "type": "String",
            "optional": false,
            "field": "source_name",
            "description": ""
          },
          {
            "group": "Success 200",
            "type": "String",
            "optional": false,
            "field": "layer",
            "description": ""
          },
          {
            "group": "Success 200",
            "type": "String",
            "optional": false,
            "field": "name",
            "description": ""
          },
          {
            "group": "Success 200",
            "type": "Object",
            "optional": false,
            "field": "output",
            "description": ""
          },
          {
            "group": "Success 200",
            "type": "Boolean",
            "optional": false,
            "field": "output.cache",
            "description": ""
          },
          {
            "group": "Success 200",
            "type": "Boolean",
            "optional": false,
            "field": "output.output",
            "description": ""
          },
          {
            "group": "Success 200",
            "type": "Boolean",
            "optional": false,
            "field": "output.preview",
            "description": ""
          },
          {
            "group": "Success 200",
            "type": "Null/String",
            "optional": false,
            "field": "loglink",
            "description": "<p>The AWS Cloudwatch Log ID of an AWS Batch run - note these logs expire</p>"
          },
          {
            "group": "Success 200",
            "type": "String",
            "allowedValues": [
              "\"Pending\"",
              "\"Running\"",
              "\"Success\"",
              "\"Fail\"",
              "\"Warn\""
            ],
            "optional": false,
            "field": "status",
            "description": "<p>The current status of a given task</p>"
          },
          {
            "group": "Success 200",
            "type": "Object",
            "optional": false,
            "field": "stats",
            "description": ""
          },
          {
            "group": "Success 200",
            "type": "Null/Integer",
            "optional": false,
            "field": "count",
            "description": ""
          },
          {
            "group": "Success 200",
            "type": "Unknown",
            "optional": false,
            "field": "bounds",
            "description": ""
          },
          {
            "group": "Success 200",
            "type": "String",
            "optional": false,
            "field": "version",
            "description": "<p>The SemVer of the task processor for this job</p>"
          },
          {
            "group": "Success 200",
            "type": "Null/Integer",
            "optional": false,
            "field": "size",
            "description": "<p>The size of the asset in bytes</p>"
          }
        ]
      }
    },
    "filename": "./routes/job.js",
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
    "success": {
      "fields": {
        "Success 200": [
          {
            "group": "Success 200",
            "type": "Integer",
            "optional": false,
            "field": "run",
            "description": ""
          },
          {
            "group": "Success 200",
            "type": "Integer[]",
            "optional": false,
            "field": "jobs",
            "description": ""
          }
        ]
      }
    },
    "filename": "./routes/job.js",
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
    "parameter": {
      "fields": {
        "query": [
          {
            "group": "query",
            "type": "Integer",
            "size": "-∞ - 100",
            "optional": true,
            "field": "limit",
            "defaultValue": "100",
            "description": "<p>Limit number of returned jobs</p>"
          },
          {
            "group": "query",
            "type": "Integer",
            "optional": true,
            "field": "run",
            "description": "<p>Only show run associated with a given ID</p>"
          },
          {
            "group": "query",
            "type": "String",
            "allowedValues": [
              "\"Pending\"",
              "\"Running\"",
              "\"Success\"",
              "\"Fail\"",
              "\"Warn\""
            ],
            "optional": true,
            "field": "status",
            "description": "<p>The current status of a given task</p>"
          },
          {
            "group": "query",
            "type": "String",
            "allowedValues": [
              "\"all\"",
              "\"true\"",
              "\"false\""
            ],
            "optional": true,
            "field": "live",
            "defaultValue": "all",
            "description": ""
          },
          {
            "group": "query",
            "type": "String",
            "optional": true,
            "field": "before",
            "description": "<p>Only show runs before the given date</p>"
          },
          {
            "group": "query",
            "type": "String",
            "optional": true,
            "field": "after",
            "description": "<p>Only show runs after the given date</p>"
          },
          {
            "group": "query",
            "type": "String",
            "optional": true,
            "field": "filter",
            "description": "<p>Filter results by source name</p>"
          }
        ]
      }
    },
    "success": {
      "fields": {
        "Success 200": [
          {
            "group": "Success 200",
            "type": "Integer",
            "optional": false,
            "field": "id",
            "description": ""
          },
          {
            "group": "Success 200",
            "type": "Integer",
            "optional": false,
            "field": "run",
            "description": ""
          },
          {
            "group": "Success 200",
            "type": "Null/Integer",
            "optional": false,
            "field": "map",
            "description": ""
          },
          {
            "group": "Success 200",
            "type": "Integer",
            "optional": false,
            "field": "created",
            "description": "<p>The timestamp at which the resource was created</p>"
          },
          {
            "group": "Success 200",
            "type": "String",
            "optional": false,
            "field": "source",
            "description": ""
          },
          {
            "group": "Success 200",
            "type": "String",
            "optional": false,
            "field": "source_name",
            "description": ""
          },
          {
            "group": "Success 200",
            "type": "String",
            "optional": false,
            "field": "layer",
            "description": ""
          },
          {
            "group": "Success 200",
            "type": "String",
            "optional": false,
            "field": "name",
            "description": ""
          },
          {
            "group": "Success 200",
            "type": "Object",
            "optional": false,
            "field": "output",
            "description": ""
          },
          {
            "group": "Success 200",
            "type": "Boolean",
            "optional": false,
            "field": "output.cache",
            "description": ""
          },
          {
            "group": "Success 200",
            "type": "Boolean",
            "optional": false,
            "field": "output.output",
            "description": ""
          },
          {
            "group": "Success 200",
            "type": "Boolean",
            "optional": false,
            "field": "output.preview",
            "description": ""
          },
          {
            "group": "Success 200",
            "type": "Null/String",
            "optional": false,
            "field": "loglink",
            "description": "<p>The AWS Cloudwatch Log ID of an AWS Batch run - note these logs expire</p>"
          },
          {
            "group": "Success 200",
            "type": "String",
            "allowedValues": [
              "\"Pending\"",
              "\"Running\"",
              "\"Success\"",
              "\"Fail\"",
              "\"Warn\""
            ],
            "optional": false,
            "field": "status",
            "description": "<p>The current status of a given task</p>"
          },
          {
            "group": "Success 200",
            "type": "Null/Integer",
            "optional": false,
            "field": "size",
            "description": "<p>The size of the asset in bytes</p>"
          }
        ]
      }
    },
    "filename": "./routes/job.js",
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
    "filename": "./routes/job.js",
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
    "filename": "./routes/job.js",
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
    "success": {
      "fields": {
        "Success 200": [
          {
            "group": "Success 200",
            "type": "Integer",
            "optional": false,
            "field": "id",
            "description": ""
          },
          {
            "group": "Success 200",
            "type": "Boolean/Object",
            "optional": false,
            "field": "license",
            "description": ""
          },
          {
            "group": "Success 200",
            "type": "Boolean/String",
            "optional": true,
            "field": "s3",
            "description": ""
          },
          {
            "group": "Success 200",
            "type": "Integer",
            "optional": false,
            "field": "run",
            "description": ""
          },
          {
            "group": "Success 200",
            "type": "Null/Integer",
            "optional": false,
            "field": "map",
            "description": ""
          },
          {
            "group": "Success 200",
            "type": "Integer",
            "optional": false,
            "field": "created",
            "description": "<p>The timestamp at which the resource was created</p>"
          },
          {
            "group": "Success 200",
            "type": "String",
            "optional": false,
            "field": "source",
            "description": ""
          },
          {
            "group": "Success 200",
            "type": "String",
            "optional": false,
            "field": "source_name",
            "description": ""
          },
          {
            "group": "Success 200",
            "type": "String",
            "optional": false,
            "field": "layer",
            "description": ""
          },
          {
            "group": "Success 200",
            "type": "String",
            "optional": false,
            "field": "name",
            "description": ""
          },
          {
            "group": "Success 200",
            "type": "Object",
            "optional": false,
            "field": "output",
            "description": ""
          },
          {
            "group": "Success 200",
            "type": "Boolean",
            "optional": false,
            "field": "output.cache",
            "description": ""
          },
          {
            "group": "Success 200",
            "type": "Boolean",
            "optional": false,
            "field": "output.output",
            "description": ""
          },
          {
            "group": "Success 200",
            "type": "Boolean",
            "optional": false,
            "field": "output.preview",
            "description": ""
          },
          {
            "group": "Success 200",
            "type": "Null/String",
            "optional": false,
            "field": "loglink",
            "description": "<p>The AWS Cloudwatch Log ID of an AWS Batch run - note these logs expire</p>"
          },
          {
            "group": "Success 200",
            "type": "String",
            "allowedValues": [
              "\"Pending\"",
              "\"Running\"",
              "\"Success\"",
              "\"Fail\"",
              "\"Warn\""
            ],
            "optional": false,
            "field": "status",
            "description": "<p>The current status of a given task</p>"
          },
          {
            "group": "Success 200",
            "type": "Object",
            "optional": false,
            "field": "stats",
            "description": ""
          },
          {
            "group": "Success 200",
            "type": "Null/Integer",
            "optional": false,
            "field": "count",
            "description": ""
          },
          {
            "group": "Success 200",
            "type": "Unknown",
            "optional": false,
            "field": "bounds",
            "description": ""
          },
          {
            "group": "Success 200",
            "type": "String",
            "optional": false,
            "field": "version",
            "description": "<p>The SemVer of the task processor for this job</p>"
          },
          {
            "group": "Success 200",
            "type": "Null/Integer",
            "optional": false,
            "field": "size",
            "description": "<p>The size of the asset in bytes</p>"
          }
        ]
      }
    },
    "filename": "./routes/job.js",
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
    "success": {
      "fields": {
        "Success 200": [
          {
            "group": "Success 200",
            "type": "Object",
            "optional": false,
            "field": "compare",
            "description": ""
          },
          {
            "group": "Success 200",
            "type": "Integer",
            "optional": false,
            "field": "compare.id",
            "description": ""
          },
          {
            "group": "Success 200",
            "type": "Integer",
            "optional": false,
            "field": "compare.count",
            "description": ""
          },
          {
            "group": "Success 200",
            "type": "Object",
            "optional": false,
            "field": "compare.stats",
            "description": ""
          },
          {
            "group": "Success 200",
            "type": "Object",
            "optional": false,
            "field": "compare.bounds",
            "description": ""
          },
          {
            "group": "Success 200",
            "type": "Number",
            "optional": true,
            "field": "compare.bounds.area",
            "description": ""
          },
          {
            "group": "Success 200",
            "type": "Object",
            "optional": true,
            "field": "compare.bounds.geom",
            "description": ""
          },
          {
            "group": "Success 200",
            "type": "Object",
            "optional": false,
            "field": "master",
            "description": ""
          },
          {
            "group": "Success 200",
            "type": "Integer",
            "optional": false,
            "field": "master.id",
            "description": ""
          },
          {
            "group": "Success 200",
            "type": "Integer",
            "optional": false,
            "field": "master.count",
            "description": ""
          },
          {
            "group": "Success 200",
            "type": "Object",
            "optional": false,
            "field": "master.stats",
            "description": ""
          },
          {
            "group": "Success 200",
            "type": "Object",
            "optional": false,
            "field": "master.bounds",
            "description": ""
          },
          {
            "group": "Success 200",
            "type": "Number",
            "optional": true,
            "field": "master.bounds.area",
            "description": ""
          },
          {
            "group": "Success 200",
            "type": "Object",
            "optional": true,
            "field": "master.bounds.geom",
            "description": ""
          },
          {
            "group": "Success 200",
            "type": "Object",
            "optional": false,
            "field": "delta",
            "description": ""
          },
          {
            "group": "Success 200",
            "type": "Integer",
            "optional": false,
            "field": "delta.count",
            "description": ""
          },
          {
            "group": "Success 200",
            "type": "Object",
            "optional": false,
            "field": "delta.stats",
            "description": ""
          },
          {
            "group": "Success 200",
            "type": "Object",
            "optional": false,
            "field": "delta.bounds",
            "description": ""
          }
        ]
      }
    },
    "filename": "./routes/job.js",
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
    "success": {
      "fields": {
        "Success 200": [
          {
            "group": "Success 200",
            "type": "Integer",
            "optional": false,
            "field": "id",
            "description": "<p>The linenumber of the log message</p>"
          },
          {
            "group": "Success 200",
            "type": "Integer",
            "optional": false,
            "field": "timestamp",
            "description": "<p>The time at which the particular line was generated</p>"
          },
          {
            "group": "Success 200",
            "type": "String",
            "optional": false,
            "field": "message",
            "description": "<p>The log line itself</p>"
          }
        ]
      }
    },
    "filename": "./routes/job.js",
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
    "filename": "./routes/job.js",
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
    "filename": "./routes/job.js",
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
    "filename": "./routes/job.js",
    "groupTitle": "Job"
  },
  {
    "type": "post",
    "url": "/api/level",
    "title": "Create Override",
    "version": "1.0.0",
    "name": "CreateLevelOverride",
    "group": "LevelOverride",
    "permission": [
      {
        "name": "user",
        "title": "User",
        "description": "<p>A user must be logged in to use this endpoint</p>"
      }
    ],
    "description": "<p>Create a new level override</p>",
    "parameter": {
      "fields": {
        "Body": [
          {
            "group": "Body",
            "type": "String",
            "optional": false,
            "field": "pattern",
            "description": "<p>RegExp pattern to match account emails</p>"
          },
          {
            "group": "Body",
            "type": "String",
            "allowedValues": [
              "\"basic\"",
              "\"backer\"",
              "\"sponsor\""
            ],
            "optional": false,
            "field": "level",
            "description": "<p>The level of donation of a given user</p>"
          }
        ]
      }
    },
    "success": {
      "fields": {
        "Success 200": [
          {
            "group": "Success 200",
            "type": "Integer",
            "optional": false,
            "field": "id",
            "description": "<p>Unique ID</p>"
          },
          {
            "group": "Success 200",
            "type": "Integer",
            "optional": false,
            "field": "created",
            "description": "<p>The timestamp at which the resource was created</p>"
          },
          {
            "group": "Success 200",
            "type": "Integer",
            "optional": false,
            "field": "updated",
            "description": "<p>The timestamp at which the resource was last updated</p>"
          },
          {
            "group": "Success 200",
            "type": "String",
            "optional": false,
            "field": "pattern",
            "description": "<p>RegExp pattern to match account emails</p>"
          },
          {
            "group": "Success 200",
            "type": "String",
            "allowedValues": [
              "\"basic\"",
              "\"backer\"",
              "\"sponsor\""
            ],
            "optional": false,
            "field": "level",
            "description": "<p>The level of donation of a given user</p>"
          }
        ]
      }
    },
    "filename": "./routes/level-override.js",
    "groupTitle": "LevelOverride"
  },
  {
    "type": "delete",
    "url": "/api/level/:levelid",
    "title": "Delete Override",
    "version": "1.0.0",
    "name": "DeleteLevelOverride",
    "group": "LevelOverride",
    "permission": [
      {
        "name": "user",
        "title": "User",
        "description": "<p>A user must be logged in to use this endpoint</p>"
      }
    ],
    "description": "<p>Delete a level override</p>",
    "success": {
      "fields": {
        "Success 200": [
          {
            "group": "Success 200",
            "type": "Integer",
            "optional": false,
            "field": "status",
            "description": "<p>The HTTP Status Code of the response</p>"
          },
          {
            "group": "Success 200",
            "type": "String",
            "optional": false,
            "field": "message",
            "description": "<p>A human readable status message</p>"
          }
        ]
      }
    },
    "filename": "./routes/level-override.js",
    "groupTitle": "LevelOverride"
  },
  {
    "type": "get",
    "url": "/api/level/:levelid",
    "title": "Get Override",
    "version": "1.0.0",
    "name": "GetLevelOverride",
    "group": "LevelOverride",
    "permission": [
      {
        "name": "user",
        "title": "User",
        "description": "<p>A user must be logged in to use this endpoint</p>"
      }
    ],
    "description": "<p>Get a level override</p>",
    "parameter": {
      "fields": {
        "Body": [
          {
            "group": "Body",
            "type": "String",
            "optional": true,
            "field": "pattern",
            "description": "<p>RegExp pattern to match account emails</p>"
          },
          {
            "group": "Body",
            "type": "String",
            "allowedValues": [
              "\"basic\"",
              "\"backer\"",
              "\"sponsor\""
            ],
            "optional": true,
            "field": "level",
            "description": "<p>The level of donation of a given user</p>"
          }
        ]
      }
    },
    "success": {
      "fields": {
        "Success 200": [
          {
            "group": "Success 200",
            "type": "Integer",
            "optional": false,
            "field": "id",
            "description": "<p>Unique ID</p>"
          },
          {
            "group": "Success 200",
            "type": "Integer",
            "optional": false,
            "field": "created",
            "description": "<p>The timestamp at which the resource was created</p>"
          },
          {
            "group": "Success 200",
            "type": "Integer",
            "optional": false,
            "field": "updated",
            "description": "<p>The timestamp at which the resource was last updated</p>"
          },
          {
            "group": "Success 200",
            "type": "String",
            "optional": false,
            "field": "pattern",
            "description": "<p>RegExp pattern to match account emails</p>"
          },
          {
            "group": "Success 200",
            "type": "String",
            "allowedValues": [
              "\"basic\"",
              "\"backer\"",
              "\"sponsor\""
            ],
            "optional": false,
            "field": "level",
            "description": "<p>The level of donation of a given user</p>"
          }
        ]
      }
    },
    "filename": "./routes/level-override.js",
    "groupTitle": "LevelOverride"
  },
  {
    "type": "get",
    "url": "/api/level",
    "title": "List Override",
    "version": "1.0.0",
    "name": "ListLevelOverride",
    "group": "LevelOverride",
    "permission": [
      {
        "name": "user",
        "title": "User",
        "description": "<p>A user must be logged in to use this endpoint</p>"
      }
    ],
    "description": "<p>List level overrides</p>",
    "parameter": {
      "fields": {
        "Query": [
          {
            "group": "Query",
            "type": "Integer",
            "size": "-∞ - 100",
            "optional": true,
            "field": "limit",
            "defaultValue": "100",
            "description": "<p>Limit number of returned runs</p>"
          },
          {
            "group": "Query",
            "type": "Integer",
            "optional": true,
            "field": "page",
            "defaultValue": "100",
            "description": "<p>The offset based on limit to return</p>"
          },
          {
            "group": "Query",
            "type": "String",
            "optional": true,
            "field": "filter",
            "defaultValue": "",
            "description": "<p>Filter a complete or partial pattern</p>"
          },
          {
            "group": "Query",
            "type": "String",
            "allowedValues": [
              "\"basic\"",
              "\"backer\"",
              "\"sponsor\""
            ],
            "optional": true,
            "field": "level",
            "description": "<p>The level of donation of a given user</p>"
          }
        ]
      }
    },
    "success": {
      "fields": {
        "Success 200": [
          {
            "group": "Success 200",
            "type": "Integer",
            "optional": false,
            "field": "total",
            "description": ""
          },
          {
            "group": "Success 200",
            "type": "Object[]",
            "optional": false,
            "field": "level_override",
            "description": ""
          },
          {
            "group": "Success 200",
            "type": "Integer",
            "optional": false,
            "field": "level_override.id",
            "description": "<p>Unique ID</p>"
          },
          {
            "group": "Success 200",
            "type": "Integer",
            "optional": false,
            "field": "level_override.created",
            "description": "<p>The timestamp at which the resource was created</p>"
          },
          {
            "group": "Success 200",
            "type": "Integer",
            "optional": false,
            "field": "level_override.updated",
            "description": "<p>The timestamp at which the resource was last updated</p>"
          },
          {
            "group": "Success 200",
            "type": "String",
            "optional": false,
            "field": "level_override.pattern",
            "description": "<p>RegExp pattern to match account emails</p>"
          },
          {
            "group": "Success 200",
            "type": "String",
            "allowedValues": [
              "\"basic\"",
              "\"backer\"",
              "\"sponsor\""
            ],
            "optional": false,
            "field": "level_override.level",
            "description": "<p>The level of donation of a given user</p>"
          }
        ]
      }
    },
    "filename": "./routes/level-override.js",
    "groupTitle": "LevelOverride"
  },
  {
    "type": "patch",
    "url": "/api/level/:levelid",
    "title": "Patch Override",
    "version": "1.0.0",
    "name": "PatchLevelOverride",
    "group": "LevelOverride",
    "permission": [
      {
        "name": "user",
        "title": "User",
        "description": "<p>A user must be logged in to use this endpoint</p>"
      }
    ],
    "description": "<p>Patch a level override</p>",
    "parameter": {
      "fields": {
        "Body": [
          {
            "group": "Body",
            "type": "String",
            "optional": true,
            "field": "pattern",
            "description": "<p>RegExp pattern to match account emails</p>"
          },
          {
            "group": "Body",
            "type": "String",
            "allowedValues": [
              "\"basic\"",
              "\"backer\"",
              "\"sponsor\""
            ],
            "optional": true,
            "field": "level",
            "description": "<p>The level of donation of a given user</p>"
          }
        ]
      }
    },
    "success": {
      "fields": {
        "Success 200": [
          {
            "group": "Success 200",
            "type": "Integer",
            "optional": false,
            "field": "id",
            "description": "<p>Unique ID</p>"
          },
          {
            "group": "Success 200",
            "type": "Integer",
            "optional": false,
            "field": "created",
            "description": "<p>The timestamp at which the resource was created</p>"
          },
          {
            "group": "Success 200",
            "type": "Integer",
            "optional": false,
            "field": "updated",
            "description": "<p>The timestamp at which the resource was last updated</p>"
          },
          {
            "group": "Success 200",
            "type": "String",
            "optional": false,
            "field": "pattern",
            "description": "<p>RegExp pattern to match account emails</p>"
          },
          {
            "group": "Success 200",
            "type": "String",
            "allowedValues": [
              "\"basic\"",
              "\"backer\"",
              "\"sponsor\""
            ],
            "optional": false,
            "field": "level",
            "description": "<p>The level of donation of a given user</p>"
          }
        ]
      }
    },
    "filename": "./routes/level-override.js",
    "groupTitle": "LevelOverride"
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
    "type": "get",
    "url": "/api/map/borders/:z/:x/:y.mvt",
    "title": "Borders MVT",
    "version": "1.0.0",
    "name": "BorderVectorTile",
    "group": "Map",
    "permission": [
      {
        "name": "public",
        "title": "Public",
        "description": "<p>This API endpoint does not require authentication</p>"
      }
    ],
    "description": "<p>Retrive borders Mapbox Vector Tiles</p>",
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
    "filename": "./routes/map.js",
    "groupTitle": "Map"
  },
  {
    "type": "get",
    "url": "/api/map/fabric/:z/:x/:y.mvt",
    "title": "Fabric MVT",
    "version": "1.0.0",
    "name": "FabricVectorTile",
    "group": "Map",
    "permission": [
      {
        "name": "public",
        "title": "Public",
        "description": "<p>This API endpoint does not require authentication</p>"
      }
    ],
    "description": "<p>Retrive fabric Mapbox Vector Tiles</p>",
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
    "filename": "./routes/map.js",
    "groupTitle": "Map"
  },
  {
    "type": "get",
    "url": "/api/map",
    "title": "Coverage TileJSON",
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
    "description": "<p>Data required for map initialization</p>",
    "filename": "./routes/map.js",
    "groupTitle": "Map"
  },
  {
    "type": "get",
    "url": "/api/map/:z/:x/:y.mvt",
    "title": "Coverage MVT",
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
    "description": "<p>Retrive coverage Mapbox Vector Tiles</p>",
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
    "filename": "./routes/map.js",
    "groupTitle": "Map"
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
    "parameter": {
      "fields": {
        "Body": [
          {
            "group": "Body",
            "type": "Boolean",
            "optional": true,
            "field": "live",
            "description": ""
          },
          {
            "group": "Body",
            "type": "Null/Object",
            "optional": true,
            "field": "github",
            "description": ""
          }
        ]
      }
    },
    "success": {
      "fields": {
        "Success 200": [
          {
            "group": "Success 200",
            "type": "Integer",
            "optional": false,
            "field": "id",
            "description": ""
          },
          {
            "group": "Success 200",
            "type": "Boolean",
            "optional": false,
            "field": "live",
            "description": ""
          },
          {
            "group": "Success 200",
            "type": "Integer",
            "optional": false,
            "field": "created",
            "description": "<p>The timestamp at which the resource was created</p>"
          },
          {
            "group": "Success 200",
            "type": "Boolean",
            "optional": false,
            "field": "closed",
            "description": ""
          },
          {
            "group": "Success 200",
            "type": "Object",
            "optional": true,
            "field": "github",
            "description": "<p>Used by the data-pls CI tool</p>"
          },
          {
            "group": "Success 200",
            "type": "String",
            "optional": true,
            "field": "github.ref",
            "description": "<p>Git reference (branch) of the given run</p>"
          },
          {
            "group": "Success 200",
            "type": "String",
            "optional": true,
            "field": "github.sha",
            "description": "<p>Git SHA of the given run</p>"
          },
          {
            "group": "Success 200",
            "type": "String",
            "optional": true,
            "field": "github.url",
            "description": "<p>Github URL to the specific commit</p>"
          },
          {
            "group": "Success 200",
            "type": "Integer",
            "optional": true,
            "field": "github.check",
            "description": "<p>Github check ID to update</p>"
          }
        ]
      }
    },
    "filename": "./routes/run.js",
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
        "Query": [
          {
            "group": "Query",
            "type": "Integer",
            "size": "-∞ - 100",
            "optional": true,
            "field": "limit",
            "defaultValue": "100",
            "description": "<p>Limit number of returned runs</p>"
          },
          {
            "group": "Query",
            "type": "Integer",
            "optional": true,
            "field": "run",
            "description": "<p>Only show run associated with a given ID</p>"
          },
          {
            "group": "Query",
            "type": "String",
            "allowedValues": [
              "\"Pending\"",
              "\"Running\"",
              "\"Success\"",
              "\"Fail\"",
              "\"Warn\""
            ],
            "optional": true,
            "field": "status",
            "description": "<p>The current status of a given task</p>"
          },
          {
            "group": "Query",
            "type": "String",
            "optional": true,
            "field": "before",
            "description": "<p>Only show runs before the given date</p>"
          },
          {
            "group": "Query",
            "type": "String",
            "optional": true,
            "field": "after",
            "description": "<p>Only show runs after the given date</p>"
          }
        ]
      }
    },
    "success": {
      "fields": {
        "Success 200": [
          {
            "group": "Success 200",
            "type": "Integer",
            "optional": false,
            "field": "id",
            "description": ""
          },
          {
            "group": "Success 200",
            "type": "Boolean",
            "optional": false,
            "field": "live",
            "description": "<p>If true, successful jobs immediately become the most recent live data</p>"
          },
          {
            "group": "Success 200",
            "type": "Integer",
            "optional": false,
            "field": "created",
            "description": "<p>The timestamp at which the resource was created</p>"
          },
          {
            "group": "Success 200",
            "type": "Object",
            "optional": false,
            "field": "github",
            "description": "<p>Used by the data-pls CI tool</p>"
          },
          {
            "group": "Success 200",
            "type": "String",
            "optional": false,
            "field": "github.ref",
            "description": "<p>Git reference (branch) of the given run</p>"
          },
          {
            "group": "Success 200",
            "type": "String",
            "optional": false,
            "field": "github.sha",
            "description": "<p>Git SHA of the given run</p>"
          },
          {
            "group": "Success 200",
            "type": "String",
            "optional": false,
            "field": "github.url",
            "description": "<p>Github URL to the specific commit</p>"
          },
          {
            "group": "Success 200",
            "type": "Integer",
            "optional": false,
            "field": "github.check",
            "description": "<p>Github check ID to update</p>"
          },
          {
            "group": "Success 200",
            "type": "Boolean",
            "optional": false,
            "field": "closed",
            "description": "<p>Is the Run still accepting jobs</p>"
          },
          {
            "group": "Success 200",
            "type": "String",
            "allowedValues": [
              "\"Pending\"",
              "\"Running\"",
              "\"Success\"",
              "\"Fail\"",
              "\"Warn\""
            ],
            "optional": false,
            "field": "status",
            "description": "<p>The current status of a given task</p>"
          },
          {
            "group": "Success 200",
            "type": "Integer",
            "optional": false,
            "field": "jobs",
            "description": "<p>The number of jobs in this run</p>"
          }
        ]
      }
    },
    "filename": "./routes/run.js",
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
    "success": {
      "fields": {
        "Success 200": [
          {
            "group": "Success 200",
            "type": "Integer",
            "optional": false,
            "field": "run",
            "description": ""
          },
          {
            "group": "Success 200",
            "type": "Object",
            "optional": false,
            "field": "status",
            "description": ""
          },
          {
            "group": "Success 200",
            "type": "Integer",
            "optional": false,
            "field": "status.Warn",
            "description": ""
          },
          {
            "group": "Success 200",
            "type": "Integer",
            "optional": false,
            "field": "status.Success",
            "description": ""
          },
          {
            "group": "Success 200",
            "type": "Integer",
            "optional": false,
            "field": "status.Pending",
            "description": ""
          },
          {
            "group": "Success 200",
            "type": "Integer",
            "optional": false,
            "field": "status.Fail",
            "description": ""
          }
        ]
      }
    },
    "filename": "./routes/run.js",
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
    "success": {
      "fields": {
        "Success 200": [
          {
            "group": "Success 200",
            "type": "Integer",
            "optional": false,
            "field": "id",
            "description": ""
          },
          {
            "group": "Success 200",
            "type": "Boolean",
            "optional": false,
            "field": "live",
            "description": ""
          },
          {
            "group": "Success 200",
            "type": "Integer",
            "optional": false,
            "field": "created",
            "description": "<p>The timestamp at which the resource was created</p>"
          },
          {
            "group": "Success 200",
            "type": "Boolean",
            "optional": false,
            "field": "closed",
            "description": ""
          },
          {
            "group": "Success 200",
            "type": "Object",
            "optional": true,
            "field": "github",
            "description": "<p>Used by the data-pls CI tool</p>"
          },
          {
            "group": "Success 200",
            "type": "String",
            "optional": true,
            "field": "github.ref",
            "description": "<p>Git reference (branch) of the given run</p>"
          },
          {
            "group": "Success 200",
            "type": "String",
            "optional": true,
            "field": "github.sha",
            "description": "<p>Git SHA of the given run</p>"
          },
          {
            "group": "Success 200",
            "type": "String",
            "optional": true,
            "field": "github.url",
            "description": "<p>Github URL to the specific commit</p>"
          },
          {
            "group": "Success 200",
            "type": "Integer",
            "optional": true,
            "field": "github.check",
            "description": "<p>Github check ID to update</p>"
          }
        ]
      }
    },
    "filename": "./routes/run.js",
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
    "success": {
      "fields": {
        "Success 200": [
          {
            "group": "Success 200",
            "type": "Integer",
            "optional": false,
            "field": "run",
            "description": ""
          },
          {
            "group": "Success 200",
            "type": "Object[]",
            "optional": false,
            "field": "jobs",
            "description": ""
          },
          {
            "group": "Success 200",
            "type": "Integer",
            "optional": false,
            "field": "jobs.id",
            "description": ""
          },
          {
            "group": "Success 200",
            "type": "Boolean/Object",
            "optional": false,
            "field": "jobs.license",
            "description": ""
          },
          {
            "group": "Success 200",
            "type": "Boolean/String",
            "optional": true,
            "field": "jobs.s3",
            "description": ""
          },
          {
            "group": "Success 200",
            "type": "Integer",
            "optional": false,
            "field": "jobs.run",
            "description": ""
          },
          {
            "group": "Success 200",
            "type": "Null/Integer",
            "optional": false,
            "field": "jobs.map",
            "description": ""
          },
          {
            "group": "Success 200",
            "type": "Integer",
            "optional": false,
            "field": "jobs.created",
            "description": "<p>The timestamp at which the resource was created</p>"
          },
          {
            "group": "Success 200",
            "type": "String",
            "optional": false,
            "field": "jobs.source",
            "description": ""
          },
          {
            "group": "Success 200",
            "type": "String",
            "optional": false,
            "field": "jobs.source_name",
            "description": ""
          },
          {
            "group": "Success 200",
            "type": "String",
            "optional": false,
            "field": "jobs.layer",
            "description": ""
          },
          {
            "group": "Success 200",
            "type": "String",
            "optional": false,
            "field": "jobs.name",
            "description": ""
          },
          {
            "group": "Success 200",
            "type": "Object",
            "optional": false,
            "field": "jobs.output",
            "description": ""
          },
          {
            "group": "Success 200",
            "type": "Boolean",
            "optional": false,
            "field": "jobs.output.cache",
            "description": ""
          },
          {
            "group": "Success 200",
            "type": "Boolean",
            "optional": false,
            "field": "jobs.output.output",
            "description": ""
          },
          {
            "group": "Success 200",
            "type": "Boolean",
            "optional": false,
            "field": "jobs.output.preview",
            "description": ""
          },
          {
            "group": "Success 200",
            "type": "Null/String",
            "optional": false,
            "field": "jobs.loglink",
            "description": "<p>The AWS Cloudwatch Log ID of an AWS Batch run - note these logs expire</p>"
          },
          {
            "group": "Success 200",
            "type": "String",
            "allowedValues": [
              "\"Pending\"",
              "\"Running\"",
              "\"Success\"",
              "\"Fail\"",
              "\"Warn\""
            ],
            "optional": false,
            "field": "jobs.status",
            "description": "<p>The current status of a given task</p>"
          },
          {
            "group": "Success 200",
            "type": "Object",
            "optional": false,
            "field": "jobs.stats",
            "description": ""
          },
          {
            "group": "Success 200",
            "type": "Null/Integer",
            "optional": false,
            "field": "jobs.count",
            "description": ""
          },
          {
            "group": "Success 200",
            "type": "Unknown",
            "optional": false,
            "field": "jobs.bounds",
            "description": ""
          },
          {
            "group": "Success 200",
            "type": "String",
            "optional": false,
            "field": "jobs.version",
            "description": "<p>The SemVer of the task processor for this job</p>"
          },
          {
            "group": "Success 200",
            "type": "Null/Integer",
            "optional": false,
            "field": "jobs.size",
            "description": "<p>The size of the asset in bytes</p>"
          }
        ]
      }
    },
    "filename": "./routes/run.js",
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
        ],
        "Body": [
          {
            "group": "Body",
            "type": "String/Object[]",
            "optional": false,
            "field": "jobs",
            "description": ""
          }
        ]
      }
    },
    "success": {
      "fields": {
        "Success 200": [
          {
            "group": "Success 200",
            "type": "Integer",
            "optional": false,
            "field": "run",
            "description": ""
          },
          {
            "group": "Success 200",
            "type": "Integer[]",
            "optional": false,
            "field": "jobs",
            "description": ""
          }
        ]
      }
    },
    "filename": "./routes/run.js",
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
        ],
        "Body": [
          {
            "group": "Body",
            "type": "Boolean",
            "optional": true,
            "field": "live",
            "description": ""
          },
          {
            "group": "Body",
            "type": "Boolean",
            "optional": true,
            "field": "closed",
            "description": ""
          },
          {
            "group": "Body",
            "type": "Null/Object",
            "optional": true,
            "field": "github",
            "description": ""
          }
        ]
      }
    },
    "success": {
      "fields": {
        "Success 200": [
          {
            "group": "Success 200",
            "type": "Integer",
            "optional": false,
            "field": "id",
            "description": ""
          },
          {
            "group": "Success 200",
            "type": "Boolean",
            "optional": false,
            "field": "live",
            "description": ""
          },
          {
            "group": "Success 200",
            "type": "Integer",
            "optional": false,
            "field": "created",
            "description": "<p>The timestamp at which the resource was created</p>"
          },
          {
            "group": "Success 200",
            "type": "Boolean",
            "optional": false,
            "field": "closed",
            "description": ""
          },
          {
            "group": "Success 200",
            "type": "Object",
            "optional": true,
            "field": "github",
            "description": "<p>Used by the data-pls CI tool</p>"
          },
          {
            "group": "Success 200",
            "type": "String",
            "optional": true,
            "field": "github.ref",
            "description": "<p>Git reference (branch) of the given run</p>"
          },
          {
            "group": "Success 200",
            "type": "String",
            "optional": true,
            "field": "github.sha",
            "description": "<p>Git SHA of the given run</p>"
          },
          {
            "group": "Success 200",
            "type": "String",
            "optional": true,
            "field": "github.url",
            "description": "<p>Github URL to the specific commit</p>"
          },
          {
            "group": "Success 200",
            "type": "Integer",
            "optional": true,
            "field": "github.check",
            "description": "<p>Github check ID to update</p>"
          }
        ]
      }
    },
    "filename": "./routes/run.js",
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
    "parameter": {
      "fields": {
        "Body": [
          {
            "group": "Body",
            "type": "String",
            "allowedValues": [
              "\"close\"",
              "\"scale\"",
              "\"level\"",
              "\"collect\"",
              "\"sources\""
            ],
            "optional": false,
            "field": "type",
            "description": ""
          }
        ]
      }
    },
    "success": {
      "fields": {
        "Success 200": [
          {
            "group": "Success 200",
            "type": "Integer",
            "optional": false,
            "field": "status",
            "description": "<p>The HTTP Status Code of the response</p>"
          },
          {
            "group": "Success 200",
            "type": "String",
            "optional": false,
            "field": "message",
            "description": "<p>A human readable status message</p>"
          }
        ]
      }
    },
    "filename": "./routes/schedule.js",
    "groupTitle": "Schedule"
  },
  {
    "type": "get",
    "url": "/api/schema",
    "title": "List Schemas",
    "version": "1.0.0",
    "name": "ListSchemas",
    "group": "Schemas",
    "permission": [
      {
        "name": "public",
        "title": "Public",
        "description": "<p>This API endpoint does not require authentication</p>"
      }
    ],
    "description": "<p>List all JSON Schemas in use With no parameters this API will return a list of all the endpoints that have a form of schema validation If the url/method params are used, the schemas themselves are returned</p> <pre><code>Note: If url or method params are used, they must be used together</code></pre>",
    "parameter": {
      "fields": {
        "Query": [
          {
            "group": "Query",
            "type": "String",
            "allowedValues": [
              "\"GET\"",
              "\"HEAD\"",
              "\"POST\"",
              "\"PUT\"",
              "\"DELETE\"",
              "\"CONNECT\"",
              "\"OPTIONS\"",
              "\"TRACE\"",
              "\"PATCH\""
            ],
            "optional": true,
            "field": "method",
            "description": "<p>HTTP Verb</p>"
          },
          {
            "group": "Query",
            "type": "String",
            "optional": true,
            "field": "url",
            "description": "<p>URLEncoded URL that you want to fetch</p>"
          }
        ]
      }
    },
    "filename": "./routes/schema.js",
    "groupTitle": "Schemas"
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
    "success": {
      "fields": {
        "Success 200": [
          {
            "group": "Success 200",
            "type": "Integer",
            "optional": false,
            "field": "status",
            "description": "<p>The HTTP Status Code of the response</p>"
          },
          {
            "group": "Success 200",
            "type": "String",
            "optional": false,
            "field": "message",
            "description": "<p>A human readable status message</p>"
          }
        ]
      }
    },
    "filename": "./routes/upload.js",
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
    "filename": "./routes/github.js",
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
    "filename": "./routes/opencollective.js",
    "groupTitle": "Webhooks"
  }
] });
