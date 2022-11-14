
/**
* @api {get} /schema GET /schema
* @apiVersion 1.0.0
* @apiName GET-/schema
* @apiGroup Default
* @apiPermission Unknown
*
* @apidescription
*   No Description
*

*
* @apiSchema (Query) {jsonschema=../schema/req.query.ListSchema.json} apiParam
*
* @apiSchema {jsonschema=../schema/res.ListSchema.json} apiSuccess
*/


/**
* @api {delete} /cache/:cache_key Delete Key
* @apiVersion 1.0.0
* @apiName DELETE-/cache/:cache_key
* @apiGroup Cache
* @apiPermission admin
*
* @apidescription
*   Flush the Memcached Cache
*
* @apiParam {string} cache_key param
*
*
*
* @apiSchema {jsonschema=../schema/res.Standard.json} apiSuccess
*/


/**
* @api {delete} /cache Flush Cache
* @apiVersion 1.0.0
* @apiName DELETE-/cache
* @apiGroup Cache
* @apiPermission admin
*
* @apidescription
*   Flush the Memcached Cache
*

*
*
*
* @apiSchema {jsonschema=../schema/res.Standard.json} apiSuccess
*/


/**
* @api {get} /collections List Collections
* @apiVersion 1.0.0
* @apiName GET-/collections
* @apiGroup Collections
* @apiPermission public
*
* @apidescription
*   Return a list of all collections and their glob rules
*

*
*
*
* @apiSchema {jsonschema=../schema/res.ListCollections.json} apiSuccess
*/


/**
* @api {get} /collections/:collection/data Collection Data
* @apiVersion 1.0.0
* @apiName GET-/collections/:collection/data
* @apiGroup Collections
* @apiPermission user
*
* @apidescription
*
Download a given collection file

Note: the user must be authenticated to perform a download. One of our largest costs is
S3 egress, authenticated downloads allow us to prevent abuse, keep the project running and the data free.

Faster Downloads? Have AWS? The Jobs, Data, & Collections API all return an "s3" property which links
to a requester pays object on S3. For those that are able, this is the best way to download data.

OpenAddresses is entirely funded by volunteers (many of them the developers themselves!)
Please consider donating if you are able https://opencollective.com/openaddresses

*
* @apiParam {integer} collection param
*
*
*
*
*/


/**
* @api {get} /collections/:collection Get Collection
* @apiVersion 1.0.0
* @apiName GET-/collections/:collection
* @apiGroup Collections
* @apiPermission public
*
* @apidescription
*   Get a given collection
*
* @apiParam {integer} collection param
*
*
*
* @apiSchema {jsonschema=../schema/res.Collection.json} apiSuccess
*/


/**
* @api {delete} /collections/:collection Delete Collection
* @apiVersion 1.0.0
* @apiName DELETE-/collections/:collection
* @apiGroup Collections
* @apiPermission admin
*
* @apidescription
*   Delete a collection (This should not be done lightly)
*
* @apiParam {integer} collection param
*
*
*
* @apiSchema {jsonschema=../schema/res.Standard.json} apiSuccess
*/


/**
* @api {post} /collections Create Collection
* @apiVersion 1.0.0
* @apiName POST-/collections
* @apiGroup Collections
* @apiPermission admin
*
* @apidescription
*   Create a new collection
*

*
*
* @apiSchema (Body) {jsonschema=../schema/req.body.CreateCollection.json} apiParam
* @apiSchema {jsonschema=../schema/res.Collection.json} apiSuccess
*/


/**
* @api {patch} /collections/:collection Update Collection
* @apiVersion 1.0.0
* @apiName PATCH-/collections/:collection
* @apiGroup Collections
* @apiPermission admin
*
* @apidescription
*   Update a collection
*
* @apiParam {integer} collection param
*
*
* @apiSchema (Body) {jsonschema=../schema/req.body.PatchCollection.json} apiParam
* @apiSchema {jsonschema=../schema/res.Collection.json} apiSuccess
*/


/**
* @api {get} /data List Data
* @apiVersion 1.0.0
* @apiName GET-/data
* @apiGroup Data
* @apiPermission public
*
* @apidescription
*   Get the latest successful run of a given geographic area
*

*
* @apiSchema (Query) {jsonschema=../schema/req.query.ListData.json} apiParam
*
* @apiSchema {jsonschema=../schema/res.ListData.json} apiSuccess
*/


/**
* @api {patch} /data/:data Update Data
* @apiVersion 1.0.0
* @apiName PATCH-/data/:data
* @apiGroup Data
* @apiPermission admin
*
* @apidescription
*   Update an existing data object
*
* @apiParam {integer} data param
*
*
* @apiSchema (Body) {jsonschema=../schema/req.body.PatchData.json} apiParam
* @apiSchema {jsonschema=../schema/res.Data.json} apiSuccess
*/


/**
* @api {delete} /data/:data Delete Data
* @apiVersion 1.0.0
* @apiName DELETE-/data/:data
* @apiGroup Data
* @apiPermission admin
*
* @apidescription
*   Remove a given data entry
*
* @apiParam {integer} data param
*
*
*
* @apiSchema {jsonschema=../schema/res.Standard.json} apiSuccess
*/


/**
* @api {get} /data/:data Get Data
* @apiVersion 1.0.0
* @apiName GET-/data/:data
* @apiGroup Data
* @apiPermission public
*
* @apidescription
*   Return all information about a specific data segment
*
* @apiParam {integer} data param
*
*
*
* @apiSchema {jsonschema=../schema/res.Data.json} apiSuccess
*/


/**
* @api {get} /data/:data/history Return Data History
* @apiVersion 1.0.0
* @apiName GET-/data/:data/history
* @apiGroup Data
* @apiPermission public
*
* @apidescription
*   Return the job history for a given data component
*
* @apiParam {integer} data param
*
*
*
* @apiSchema {jsonschema=../schema/res.DataHistory.json} apiSuccess
*/


/**
* @api {get} /job/error Get Job Errors
* @apiVersion 1.0.0
* @apiName GET-/job/error
* @apiGroup JobErrors
* @apiPermission public
*
* @apidescription
*
All jobs that fail as part of a live run are entered into the JobError API
This API powers a page that allows for human review of failing jobs
Note: Job Errors are cleared with every subsequent full cache

*

*
* @apiSchema (Query) {jsonschema=../schema/req.query.ErrorList.json} apiParam
*
* @apiSchema {jsonschema=../schema/res.ErrorList.json} apiSuccess
*/


/**
* @api {get} /job/error/count Job Error Count
* @apiVersion 1.0.0
* @apiName GET-/job/error/count
* @apiGroup JobErrors
* @apiPermission public
*
* @apidescription
*   Return a simple count of the current number of job errors
*

*
*
*
* @apiSchema {jsonschema=../schema/res.ErrorCount.json} apiSuccess
*/


/**
* @api {get} /job/error/:job Get Job Error
* @apiVersion 1.0.0
* @apiName GET-/job/error/:job
* @apiGroup JobErrors
* @apiPermission public
*
* @apidescription
*   Return a single job error if one exists
*
* @apiParam {integer} job param
*
*
*
* @apiSchema {jsonschema=../schema/res.JobError.json} apiSuccess
*/


/**
* @api {post} /job/error Create Job Error
* @apiVersion 1.0.0
* @apiName POST-/job/error
* @apiGroup JobErrors
* @apiPermission admin
*
* @apidescription
*   Create a new Job Error in response to a live job that Failed or Warned
*

*
*
* @apiSchema (Body) {jsonschema=../schema/req.body.ErrorCreate.json} apiParam
* @apiSchema {jsonschema=../schema/res.JobError.json} apiSuccess
*/


/**
* @api {post} /job/error/:job Resolve Job Error
* @apiVersion 1.0.0
* @apiName POST-/job/error/:job
* @apiGroup JobErrors
* @apiPermission admin
*
* @apidescription
*   Mark a job error as resolved
*
* @apiParam {integer} job param
*
*
* @apiSchema (Body) {jsonschema=../schema/req.body.ErrorModerate.json} apiParam
* @apiSchema {jsonschema=../schema/res.ErrorModerate.json} apiSuccess
*/


/**
* @api {post} /export Create Export
* @apiVersion 1.0.0
* @apiName POST-/export
* @apiGroup Exports
* @apiPermission user
*
* @apidescription
*   Create a new export task
*

*
*
* @apiSchema (Body) {jsonschema=../schema/req.body.CreateExport.json} apiParam
* @apiSchema {jsonschema=../schema/res.Export.json} apiSuccess
*/


/**
* @api {get} /export/:exportid/log Get Export Log
* @apiVersion 1.0.0
* @apiName GET-/export/:exportid/log
* @apiGroup Exports
* @apiPermission user
*
* @apidescription
*
Return the batch-machine processing log for a given export
Note: These are stored in AWS CloudWatch and *do* expire
The presence of a loglink on a export does not guarantee log retention

*
* @apiParam {integer} exportid param
*
*
*
* @apiSchema {jsonschema=../schema/res.SingleLog.json} apiSuccess
*/


/**
* @api {get} /export List Export
* @apiVersion 1.0.0
* @apiName GET-/export
* @apiGroup Exports
* @apiPermission user
*
* @apidescription
*   List existing exports
*

*
* @apiSchema (Query) {jsonschema=../schema/req.query.ListExport.json} apiParam
*
* @apiSchema {jsonschema=../schema/res.ListExport.json} apiSuccess
*/


/**
* @api {get} /export/:exportid Get Export
* @apiVersion 1.0.0
* @apiName GET-/export/:exportid
* @apiGroup Exports
* @apiPermission user
*
* @apidescription
*   Get a single export
*
* @apiParam {integer} exportid param
*
*
*
* @apiSchema {jsonschema=../schema/res.Export.json} apiSuccess
*/


/**
* @api {put} /export/:exportid Re-run Export
* @apiVersion 1.0.0
* @apiName PUT-/export/:exportid
* @apiGroup Exports
* @apiPermission admin
*
* @apidescription
*   Re-run an export
*
* @apiParam {integer} exportid param
*
*
*
* @apiSchema {jsonschema=../schema/res.Standard.json} apiSuccess
*/


/**
* @api {get} /export/:exportid/output/export.zip Get Export Data
* @apiVersion 1.0.0
* @apiName GET-/export/:exportid/output/export.zip
* @apiGroup Exports
* @apiPermission user
*
* @apidescription
*   Download the data created during an export
*
* @apiParam {integer} exportid param
*
*
*
*
*/


/**
* @api {patch} /export/:exportid Patch Export
* @apiVersion 1.0.0
* @apiName PATCH-/export/:exportid
* @apiGroup Exports
* @apiPermission admin
*
* @apidescription
*   Update an export
*
* @apiParam {integer} exportid param
*
*
* @apiSchema (Body) {jsonschema=../schema/req.body.PatchExport.json} apiParam
* @apiSchema {jsonschema=../schema/res.Export.json} apiSuccess
*/


/**
* @api {get} /fabric Fabric TileJSON
* @apiVersion 1.0.0
* @apiName GET-/fabric
* @apiGroup Map
* @apiPermission public
*
* @apidescription
*   Return a TileJSON for the current fabric
*

*
*
*
* @apiSchema {jsonschema=../schema/res.TileJSON.json} apiSuccess
*/


/**
* @api {get} /fabric/:z/:x/:y.mvt Fabric MVT
* @apiVersion 1.0.0
* @apiName GET-/fabric/:z/:x/:y.mvt
* @apiGroup Map
* @apiPermission public
*
* @apidescription
*   Retreive fabric Mapbox Vector Tiles
*
* @apiParam {integer} z param
* @apiParam {integer} x param
* @apiParam {integer} y param
*
*
*
*
*/


/**
* @api {post} /github/event Github Webhook
* @apiVersion 1.0.0
* @apiName POST-/github/event
* @apiGroup Github
* @apiPermission admin
*
* @apidescription
*   Callback endpoint for GitHub Webhooks. Should not be called by user functions
*

*
*
*
*
*/


/**
* @api {get} /health Server Healthcheck
* @apiVersion 1.0.0
* @apiName GET-/health
* @apiGroup Health
* @apiPermission public
*
* @apidescription
*   AWS ELB Healthcheck
*

*
*
*
* @apiSchema {jsonschema=../schema/res.Health.json} apiSuccess
*/


/**
* @api {get} /job List Jobs
* @apiVersion 1.0.0
* @apiName GET-/job
* @apiGroup Job
* @apiPermission public
*
* @apidescription
*   Return information about a given subset of jobs
*

*
* @apiSchema (Query) {jsonschema=../schema/req.query.ListJobs.json} apiParam
*
* @apiSchema {jsonschema=../schema/res.ListJobs.json} apiSuccess
*/


/**
* @api {get} /job/:job Get Job
* @apiVersion 1.0.0
* @apiName GET-/job/:job
* @apiGroup Job
* @apiPermission public
*
* @apidescription
*   Return all information about a given job
*
* @apiParam {integer} job param
*
*
*
* @apiSchema {jsonschema=../schema/res.Job.json} apiSuccess
*/


/**
* @api {get} /job/:job/raw Raw Source
* @apiVersion 1.0.0
* @apiName GET-/job/:job/raw
* @apiGroup Job
* @apiPermission public
*
* @apidescription
*   Return the raw source from github - this API is not stable nor will it always return a consistent result
*
* @apiParam {integer} job param
*
*
*
*
*/


/**
* @api {post} /job/:job/rerun Rerun Job
* @apiVersion 1.0.0
* @apiName POST-/job/:job/rerun
* @apiGroup Job
* @apiPermission admin
*
* @apidescription
*   Submit a job for reprocessing - often useful for network errors
*
* @apiParam {integer} job param
*
*
*
* @apiSchema {jsonschema=../schema/res.SingleJobsCreate.json} apiSuccess
*/


/**
* @api {get} /job/:job/delta Job Stats Comparison
* @apiVersion 1.0.0
* @apiName GET-/job/:job/delta
* @apiGroup Job
* @apiPermission public
*
* @apidescription
*   Compare the stats of the given job against the current live data job
*
* @apiParam {integer} job param
*
*
*
* @apiSchema {jsonschema=../schema/res.SingleDelta.json} apiSuccess
*/


/**
* @api {get} /job/:job/output/source.png Get Job Preview
* @apiVersion 1.0.0
* @apiName GET-/job/:job/output/source.png
* @apiGroup Job
* @apiPermission public
*
* @apidescription
*   Return a preview image for the job
*
* @apiParam {integer} job param
*
*
*
*
*/


/**
* @api {get} /job/:job/output/validated.geojson.gz Validated Data
* @apiVersion 1.0.0
* @apiName GET-/job/:job/output/validated.geojson.gz
* @apiGroup Job
* @apiPermission user
*
* @apidescription
*
Sponsors of our project recieve access to validated data as a way of saying thanks for
keeping our project alive.

Note: the user must be authenticated to perform a download. One of our largest costs is
S3 egress, authenticated downloads allow us to prevent abuse and keep the project running and the data freetw

Faster Downloads? Have AWS? The Jobs, Data, & Collections API all return an "s3" property which links
to a requester pays object on S3. For those that are able, this is the best way to download data.

OpenAddresses is entirely funded by volunteers (many of then the developers themselves!)
Please consider donating if you are able https://opencollective.com/openaddresses

*
* @apiParam {integer} job param
*
*
*
*
*/


/**
* @api {get} /job/:job/output/source.geojson.gz Get Job Data
* @apiVersion 1.0.0
* @apiName GET-/job/:job/output/source.geojson.gz
* @apiGroup Job
* @apiPermission user
*
* @apidescription
*
Note: the user must be authenticated to perform a download. One of our largest costs is
S3 egress, authenticated downloads allow us to prevent abuse and keep the project running and the data freetw

Faster Downloads? Have AWS? The Jobs, Data, & Collections API all return an "s3" property which links
to a requester pays object on S3. For those that are able, this is the best way to download data.

OpenAddresses is entirely funded by volunteers (many of then the developers themselves!)
Please consider donating if you are able https://opencollective.com/openaddresses

*
* @apiParam {integer} job param
*
*
*
*
*/


/**
* @api {get} /job/:job/output/sample Small Sample
* @apiVersion 1.0.0
* @apiName GET-/job/:job/output/sample
* @apiGroup Job
* @apiPermission public
*
* @apidescription
*   Return an Array containing a sample of the properties
*
* @apiParam {integer} job param
*
*
*
*
*/


/**
* @api {get} /job/:job/output/cache.zip Get Job Cache
* @apiVersion 1.0.0
* @apiName GET-/job/:job/output/cache.zip
* @apiGroup Job
* @apiPermission user
*
* @apidescription
*
Note: the user must be authenticated to perform a download. One of our largest costs is
S3 egress, authenticated downloads allow us to prevent abuse and keep the project running and the data freetw

Faster Downloads? Have AWS? The Jobs, Data, & Collections API all return an "s3" property which links
to a requester pays object on S3. For those that are able, this is the best way to download data.

OpenAddresses is entirely funded by volunteers (many of then the developers themselves!)
Please consider donating if you are able https://opencollective.com/openaddresses

*
* @apiParam {integer} job param
*
*
*
*
*/


/**
* @api {get} /job/:job/log Get Job Log
* @apiVersion 1.0.0
* @apiName GET-/job/:job/log
* @apiGroup Job
* @apiPermission public
*
* @apidescription
*
Return the batch-machine processing log for a given job
Note: These are stored in AWS CloudWatch and *do* expire
The presence of a loglink on a job, does not guarentree log retention

*
* @apiParam {integer} job param
*
* @apiSchema (Query) {jsonschema=../schema/req.query.SingleLog.json} apiParam
*
* @apiSchema {jsonschema=../schema/res.SingleLog.json} apiSuccess
*/


/**
* @api {patch} /job/:job Update Job
* @apiVersion 1.0.0
* @apiName PATCH-/job/:job
* @apiGroup Job
* @apiPermission admin
*
* @apidescription
*   Update a job
*
* @apiParam {integer} job param
*
*
* @apiSchema (Body) {jsonschema=../schema/req.body.PatchJob.json} apiParam
* @apiSchema {jsonschema=../schema/res.Job.json} apiSuccess
*/


/**
* @api {get} /level List Override
* @apiVersion 1.0.0
* @apiName GET-/level
* @apiGroup LevelOverride
* @apiPermission admin
*
* @apidescription
*   List level overrides
*

*
* @apiSchema (Query) {jsonschema=../schema/req.query.ListLevelOverride.json} apiParam
*
* @apiSchema {jsonschema=../schema/res.ListLevelOverride.json} apiSuccess
*/


/**
* @api {post} /level Create Override
* @apiVersion 1.0.0
* @apiName POST-/level
* @apiGroup LevelOverride
* @apiPermission admin
*
* @apidescription
*   Create a new level override
*

*
*
* @apiSchema (Body) {jsonschema=../schema/req.body.CreateLevelOverride.json} apiParam
* @apiSchema {jsonschema=../schema/res.LevelOverride.json} apiSuccess
*/


/**
* @api {patch} /level/:levelid Patch Override
* @apiVersion 1.0.0
* @apiName PATCH-/level/:levelid
* @apiGroup LevelOverride
* @apiPermission admin
*
* @apidescription
*   Patch a level override
*
* @apiParam {integer} levelid param
*
*
* @apiSchema (Body) {jsonschema=../schema/req.body.PatchLevelOverride.json} apiParam
* @apiSchema {jsonschema=../schema/res.LevelOverride.json} apiSuccess
*/


/**
* @api {get} /level/:levelid Get Override
* @apiVersion 1.0.0
* @apiName GET-/level/:levelid
* @apiGroup LevelOverride
* @apiPermission admin
*
* @apidescription
*   Get a level override
*
* @apiParam {integer} levelid param
*
*
*
* @apiSchema {jsonschema=../schema/res.LevelOverride.json} apiSuccess
*/


/**
* @api {delete} /level/:levelid Delete Override
* @apiVersion 1.0.0
* @apiName DELETE-/level/:levelid
* @apiGroup LevelOverride
* @apiPermission admin
*
* @apidescription
*   Delete a level override
*
* @apiParam {integer} levelid param
*
*
*
* @apiSchema {jsonschema=../schema/res.Standard.json} apiSuccess
*/


/**
* @api {get} /login/verify Verify User
* @apiVersion 1.0.0
* @apiName GET-/login/verify
* @apiGroup Login
* @apiPermission public
*
* @apidescription
*   Email Verification of new user
*

*
* @apiSchema (Query) {jsonschema=../schema/req.query.VerifyLogin.json} apiParam
*
* @apiSchema {jsonschema=../schema/res.Standard.json} apiSuccess
*/


/**
* @api {get} /login Session Info
* @apiVersion 1.0.0
* @apiName GET-/login
* @apiGroup Login
* @apiPermission user
*
* @apidescription
*   Return information about the currently logged in user
*

*
* @apiSchema (Query) {jsonschema=../schema/req.query.GetLogin.json} apiParam
*
* @apiSchema {jsonschema=../schema/res.Login.json} apiSuccess
*/


/**
* @api {post} /login Create Session
* @apiVersion 1.0.0
* @apiName POST-/login
* @apiGroup Login
* @apiPermission user
*
* @apidescription
*   Log a user into the service and create an authenticated cookie
*

*
*
* @apiSchema (Body) {jsonschema=../schema/req.body.CreateLogin.json} apiParam
* @apiSchema {jsonschema=../schema/res.Login.json} apiSuccess
*/


/**
* @api {post} /login/forgot Forgot Login
* @apiVersion 1.0.0
* @apiName POST-/login/forgot
* @apiGroup Login
* @apiPermission public
*
* @apidescription
*   If a user has forgotten their password, send them a password reset link to their email
*

*
*
* @apiSchema (Body) {jsonschema=../schema/req.body.ForgotLogin.json} apiParam
* @apiSchema {jsonschema=../schema/res.Standard.json} apiSuccess
*/


/**
* @api {post} /login/reset Reset Login
* @apiVersion 1.0.0
* @apiName POST-/login/reset
* @apiGroup Login
* @apiPermission public
*
* @apidescription
*
Once a user has obtained a password reset by email via the Forgot Login API,
use the token to reset the password

*

*
*
* @apiSchema (Body) {jsonschema=../schema/req.body.ResetLogin.json} apiParam
* @apiSchema {jsonschema=../schema/res.Standard.json} apiSuccess
*/


/**
* @api {get} /map Coverage TileJSON
* @apiVersion 1.0.0
* @apiName GET-/map
* @apiGroup Map
* @apiPermission public
*
* @apidescription
*   Data required for map initialization
*

*
*
*
*
*/


/**
* @api {get} /map/features All Features
* @apiVersion 1.0.0
* @apiName GET-/map/features
* @apiGroup Map
* @apiPermission public
*
* @apidescription
*   Return all map objects in Line Delimited GeoJSON
*

*
*
*
*
*/


/**
* @api {get} /map/:mapid Map Feature
* @apiVersion 1.0.0
* @apiName GET-/map/:mapid
* @apiGroup Map
* @apiPermission public
*
* @apidescription
*   Get a single Map Object
*
* @apiParam {integer} mapid param
*
*
*
*
*/


/**
* @api {get} /map/:z/:x/:y.mvt Coverage MVT
* @apiVersion 1.0.0
* @apiName GET-/map/:z/:x/:y.mvt
* @apiGroup Map
* @apiPermission public
*
* @apidescription
*   Retreive coverage MVT
*
* @apiParam {integer} z param
* @apiParam {integer} x param
* @apiParam {integer} y param
*
*
*
*
*/


/**
* @api {post} /opencollective/event OpenCollective
* @apiVersion 1.0.0
* @apiName POST-/opencollective/event
* @apiGroup Webhooks
* @apiPermission admin
*
* @apidescription
*   Callback endpoint for OpenCollective. Should not be called by user functions
*

*
*
*
*
*/


/**
* @api {get} /run List Runs
* @apiVersion 1.0.0
* @apiName GET-/run
* @apiGroup Run
* @apiPermission public
*
* @apidescription
*   Runs are container objects that contain jobs that were started at the same time or by the same process
*

*
* @apiSchema (Query) {jsonschema=../schema/req.query.ListRuns.json} apiParam
*
* @apiSchema {jsonschema=../schema/res.ListRuns.json} apiSuccess
*/


/**
* @api {post} /run Create Runs
* @apiVersion 1.0.0
* @apiName POST-/run
* @apiGroup Run
* @apiPermission admin
*
* @apidescription
*   Create a new run to hold a batch of jobs
*

*
*
* @apiSchema (Body) {jsonschema=../schema/req.body.CreateRun.json} apiParam
* @apiSchema {jsonschema=../schema/res.Run.json} apiSuccess
*/


/**
* @api {get} /run/:run Get Runs
* @apiVersion 1.0.0
* @apiName GET-/run/:run
* @apiGroup Run
* @apiPermission public
*
* @apidescription
*   Get a single run
*
* @apiParam {integer} run param
*
*
*
* @apiSchema {jsonschema=../schema/res.Run.json} apiSuccess
*/


/**
* @api {get} /run/:run/count Run Stats
* @apiVersion 1.0.0
* @apiName GET-/run/:run/count
* @apiGroup Run
* @apiPermission public
*
* @apidescription
*   Return statistics about jobs within a given run
*
* @apiParam {integer} run param
*
*
*
* @apiSchema {jsonschema=../schema/res.RunStats.json} apiSuccess
*/


/**
* @api {patch} /run/:run Update Run
* @apiVersion 1.0.0
* @apiName PATCH-/run/:run
* @apiGroup Run
* @apiPermission public
*
* @apidescription
*   Update a run
*
* @apiParam {integer} run param
*
*
* @apiSchema (Body) {jsonschema=../schema/req.body.PatchRun.json} apiParam
* @apiSchema {jsonschema=../schema/res.Run.json} apiSuccess
*/


/**
* @api {post} /run/:run/jobs Populate Run Jobs
* @apiVersion 1.0.0
* @apiName POST-/run/:run/jobs
* @apiGroup Run
* @apiPermission admin
*
* @apidescription
*
Given an array sources, explode it into multiple jobs and submit to batch
or pass in a predefined list of sources/layer/names

Note: once jobs are attached to a run, the run is "closed" and subsequent
jobs cannot be attached to it

*
* @apiParam {integer} run param
*
*
* @apiSchema (Body) {jsonschema=../schema/req.body.SingleJobsCreate.json} apiParam
* @apiSchema {jsonschema=../schema/res.SingleJobsCreate.json} apiSuccess
*/


/**
* @api {get} /run/:run/jobs List Run Jobs
* @apiVersion 1.0.0
* @apiName GET-/run/:run/jobs
* @apiGroup Run
* @apiPermission public
*
* @apidescription
*   return all jobs for a given run
*
* @apiParam {integer} run param
*
*
*
* @apiSchema {jsonschema=../schema/res.SingleJobs.json} apiSuccess
*/


/**
* @api {post} /schedule Scheduled Event
* @apiVersion 1.0.0
* @apiName POST-/schedule
* @apiGroup Schedule
* @apiPermission admin
*
* @apidescription
*   Internal function to allow scheduled lambdas to kick off events
*

*
*
* @apiSchema (Body) {jsonschema=../schema/req.body.Schedule.json} apiParam
* @apiSchema {jsonschema=../schema/res.Standard.json} apiSuccess
*/


/**
* @api {get} /token List Tokens
* @apiVersion 1.0.0
* @apiName GET-/token
* @apiGroup Token
* @apiPermission user
*
* @apidescription
*   List all tokens associated with the requester's account
*

*
*
*
* @apiSchema {jsonschema=../schema/res.ListTokens.json} apiSuccess
*/


/**
* @api {post} /token Create Tokens
* @apiVersion 1.0.0
* @apiName POST-/token
* @apiGroup Token
* @apiPermission user
*
* @apidescription
*   Create a new API token for programatic access
*

*
*
* @apiSchema (Body) {jsonschema=../schema/req.body.CreateToken.json} apiParam
* @apiSchema {jsonschema=../schema/res.CreateToken.json} apiSuccess
*/


/**
* @api {delete} /token/:id Delete Tokens
* @apiVersion 1.0.0
* @apiName DELETE-/token/:id
* @apiGroup Token
* @apiPermission user
*
* @apidescription
*   Delete a user's API Token
*
* @apiParam {integer} id param
*
*
*
* @apiSchema {jsonschema=../schema/res.Standard.json} apiSuccess
*/


/**
* @api {post} /upload Create Upload
* @apiVersion 1.0.0
* @apiName POST-/upload
* @apiGroup Upload
* @apiPermission upload
*
* @apidescription
*
Statically cache source data

If a source is unable to be pulled from directly, authenticated users can cache
data resources to the OpenAddresses S3 cache to be pulled from

*

*
*
*
* @apiSchema {jsonschema=../schema/res.Standard.json} apiSuccess
*/


/**
* @api {get} /user List Users
* @apiVersion 1.0.0
* @apiName GET-/user
* @apiGroup User
* @apiPermission admin
*
* @apidescription
*   Return a list of users that have registered with the service
*

*
*
*
* @apiSchema {jsonschema=../schema/res.ListUsers.json} apiSuccess
*/


/**
* @api {post} /user Create User
* @apiVersion 1.0.0
* @apiName POST-/user
* @apiGroup User
* @apiPermission public
*
* @apidescription
*   Create a new user
*

*
*
* @apiSchema (Body) {jsonschema=../schema/req.body.CreateUser.json} apiParam
* @apiSchema {jsonschema=../schema/res.User.json} apiSuccess
*/


/**
* @api {get} /user/:id Single User
* @apiVersion 1.0.0
* @apiName GET-/user/:id
* @apiGroup User
* @apiPermission admin
*
* @apidescription
*   Get all info about a given user
*
* @apiParam {integer} id param
*
* @apiSchema (Query) {jsonschema=../schema/req.query.SingleUser.json} apiParam
*
* @apiSchema {jsonschema=../schema/res.User.json} apiSuccess
*/


/**
* @api {patch} /user/:id Update User
* @apiVersion 1.0.0
* @apiName PATCH-/user/:id
* @apiGroup User
* @apiPermission admin
*
* @apidescription
*   Update a user
*
* @apiParam {integer} id param
*
*
* @apiSchema (Body) {jsonschema=../schema/req.body.PatchUser.json} apiParam
* @apiSchema {jsonschema=../schema/res.User.json} apiSuccess
*/
