
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
* @api {delete} /cache DELETE /cache
* @apiVersion 1.0.0
* @apiName DELETE-/cache
* @apiGroup Default
* @apiPermission Unknown
*
* @apidescription
*   No Description
*

*
*
*
* @apiSchema {jsonschema=../schema/res.Standard.json} apiSuccess
*/


/**
* @api {delete} /cache/:cache_key DELETE /cache/:cache_key
* @apiVersion 1.0.0
* @apiName DELETE-/cache/:cache_key
* @apiGroup Default
* @apiPermission Unknown
*
* @apidescription
*   No Description
*
* @apiParam {string} cache_key param
*
*
*
* @apiSchema {jsonschema=../schema/res.Standard.json} apiSuccess
*/


/**
* @api {get} /collections GET /collections
* @apiVersion 1.0.0
* @apiName GET-/collections
* @apiGroup Default
* @apiPermission Unknown
*
* @apidescription
*   No Description
*

*
*
*
* @apiSchema {jsonschema=../schema/res.ListCollections.json} apiSuccess
*/


/**
* @api {get} /collections/:collection/data GET /collections/:collection/data
* @apiVersion 1.0.0
* @apiName GET-/collections/:collection/data
* @apiGroup Default
* @apiPermission Unknown
*
* @apidescription
*   No Description
*
* @apiParam {integer} collection param
*
*
*
*
*/


/**
* @api {get} /collections/:collection GET /collections/:collection
* @apiVersion 1.0.0
* @apiName GET-/collections/:collection
* @apiGroup Default
* @apiPermission Unknown
*
* @apidescription
*   No Description
*
* @apiParam {integer} collection param
*
*
*
* @apiSchema {jsonschema=../schema/res.Collection.json} apiSuccess
*/


/**
* @api {delete} /collections/:collection DELETE /collections/:collection
* @apiVersion 1.0.0
* @apiName DELETE-/collections/:collection
* @apiGroup Default
* @apiPermission Unknown
*
* @apidescription
*   No Description
*
* @apiParam {integer} collection param
*
*
*
* @apiSchema {jsonschema=../schema/res.Standard.json} apiSuccess
*/


/**
* @api {post} /collections POST /collections
* @apiVersion 1.0.0
* @apiName POST-/collections
* @apiGroup Default
* @apiPermission Unknown
*
* @apidescription
*   No Description
*

*
*
* @apiSchema (Body) {jsonschema=../schema/req.body.CreateCollection.json} apiParam
* @apiSchema {jsonschema=../schema/res.Collection.json} apiSuccess
*/


/**
* @api {patch} /collections/:collection PATCH /collections/:collection
* @apiVersion 1.0.0
* @apiName PATCH-/collections/:collection
* @apiGroup Default
* @apiPermission Unknown
*
* @apidescription
*   No Description
*
* @apiParam {integer} collection param
*
*
* @apiSchema (Body) {jsonschema=../schema/req.body.PatchCollection.json} apiParam
* @apiSchema {jsonschema=../schema/res.Collection.json} apiSuccess
*/


/**
* @api {get} /data GET /data
* @apiVersion 1.0.0
* @apiName GET-/data
* @apiGroup Default
* @apiPermission Unknown
*
* @apidescription
*   No Description
*

*
* @apiSchema (Query) {jsonschema=../schema/req.query.ListData.json} apiParam
*
* @apiSchema {jsonschema=../schema/res.ListData.json} apiSuccess
*/


/**
* @api {patch} /data/:data PATCH /data/:data
* @apiVersion 1.0.0
* @apiName PATCH-/data/:data
* @apiGroup Default
* @apiPermission Unknown
*
* @apidescription
*   No Description
*
* @apiParam {integer} data param
*
*
* @apiSchema (Body) {jsonschema=../schema/req.body.PatchData.json} apiParam
* @apiSchema {jsonschema=../schema/res.Data.json} apiSuccess
*/


/**
* @api {delete} /data/:data DELETE /data/:data
* @apiVersion 1.0.0
* @apiName DELETE-/data/:data
* @apiGroup Default
* @apiPermission Unknown
*
* @apidescription
*   No Description
*
* @apiParam {integer} data param
*
*
*
* @apiSchema {jsonschema=../schema/res.Standard.json} apiSuccess
*/


/**
* @api {get} /data/:data GET /data/:data
* @apiVersion 1.0.0
* @apiName GET-/data/:data
* @apiGroup Default
* @apiPermission Unknown
*
* @apidescription
*   No Description
*
* @apiParam {integer} data param
*
*
*
* @apiSchema {jsonschema=../schema/res.Data.json} apiSuccess
*/


/**
* @api {get} /data/:data/history GET /data/:data/history
* @apiVersion 1.0.0
* @apiName GET-/data/:data/history
* @apiGroup Default
* @apiPermission Unknown
*
* @apidescription
*   No Description
*
* @apiParam {integer} data param
*
*
*
* @apiSchema {jsonschema=../schema/res.DataHistory.json} apiSuccess
*/


/**
* @api {get} /job/error GET /job/error
* @apiVersion 1.0.0
* @apiName GET-/job/error
* @apiGroup Default
* @apiPermission Unknown
*
* @apidescription
*   No Description
*

*
* @apiSchema (Query) {jsonschema=../schema/req.query.ErrorList.json} apiParam
*
* @apiSchema {jsonschema=../schema/res.ErrorList.json} apiSuccess
*/


/**
* @api {get} /job/error/count GET /job/error/count
* @apiVersion 1.0.0
* @apiName GET-/job/error/count
* @apiGroup Default
* @apiPermission Unknown
*
* @apidescription
*   No Description
*

*
*
*
* @apiSchema {jsonschema=../schema/res.ErrorCount.json} apiSuccess
*/


/**
* @api {get} /job/error/:job GET /job/error/:job
* @apiVersion 1.0.0
* @apiName GET-/job/error/:job
* @apiGroup Default
* @apiPermission Unknown
*
* @apidescription
*   No Description
*
* @apiParam {integer} job param
*
*
*
* @apiSchema {jsonschema=../schema/res.JobError.json} apiSuccess
*/


/**
* @api {post} /job/error POST /job/error
* @apiVersion 1.0.0
* @apiName POST-/job/error
* @apiGroup Default
* @apiPermission Unknown
*
* @apidescription
*   No Description
*

*
*
* @apiSchema (Body) {jsonschema=../schema/req.body.ErrorCreate.json} apiParam
* @apiSchema {jsonschema=../schema/res.JobError.json} apiSuccess
*/


/**
* @api {post} /job/error/:job POST /job/error/:job
* @apiVersion 1.0.0
* @apiName POST-/job/error/:job
* @apiGroup Default
* @apiPermission Unknown
*
* @apidescription
*   No Description
*
* @apiParam {integer} job param
*
*
* @apiSchema (Body) {jsonschema=../schema/req.body.ErrorModerate.json} apiParam
* @apiSchema {jsonschema=../schema/res.ErrorModerate.json} apiSuccess
*/


/**
* @api {post} /export POST /export
* @apiVersion 1.0.0
* @apiName POST-/export
* @apiGroup Default
* @apiPermission Unknown
*
* @apidescription
*   No Description
*

*
*
* @apiSchema (Body) {jsonschema=../schema/req.body.CreateExport.json} apiParam
* @apiSchema {jsonschema=../schema/res.Export.json} apiSuccess
*/


/**
* @api {get} /export/:exportid/log GET /export/:exportid/log
* @apiVersion 1.0.0
* @apiName GET-/export/:exportid/log
* @apiGroup Default
* @apiPermission Unknown
*
* @apidescription
*   No Description
*
* @apiParam {integer} exportid param
*
*
*
* @apiSchema {jsonschema=../schema/res.SingleLog.json} apiSuccess
*/


/**
* @api {get} /export GET /export
* @apiVersion 1.0.0
* @apiName GET-/export
* @apiGroup Default
* @apiPermission Unknown
*
* @apidescription
*   No Description
*

*
* @apiSchema (Query) {jsonschema=../schema/req.query.ListExport.json} apiParam
*
* @apiSchema {jsonschema=../schema/res.ListExport.json} apiSuccess
*/


/**
* @api {get} /export/:exportid GET /export/:exportid
* @apiVersion 1.0.0
* @apiName GET-/export/:exportid
* @apiGroup Default
* @apiPermission Unknown
*
* @apidescription
*   No Description
*
* @apiParam {integer} exportid param
*
*
*
* @apiSchema {jsonschema=../schema/res.Export.json} apiSuccess
*/


/**
* @api {put} /export/:exportid PUT /export/:exportid
* @apiVersion 1.0.0
* @apiName PUT-/export/:exportid
* @apiGroup Default
* @apiPermission Unknown
*
* @apidescription
*   No Description
*
* @apiParam {integer} exportid param
*
*
*
* @apiSchema {jsonschema=../schema/res.Standard.json} apiSuccess
*/


/**
* @api {get} /export/:exportid/output/export.zip GET /export/:exportid/output/export.zip
* @apiVersion 1.0.0
* @apiName GET-/export/:exportid/output/export.zip
* @apiGroup Default
* @apiPermission Unknown
*
* @apidescription
*   No Description
*
* @apiParam {integer} exportid param
*
*
*
*
*/


/**
* @api {patch} /export/:exportid PATCH /export/:exportid
* @apiVersion 1.0.0
* @apiName PATCH-/export/:exportid
* @apiGroup Default
* @apiPermission Unknown
*
* @apidescription
*   No Description
*
* @apiParam {integer} exportid param
*
*
* @apiSchema (Body) {jsonschema=../schema/req.body.PatchExport.json} apiParam
* @apiSchema {jsonschema=../schema/res.Export.json} apiSuccess
*/


/**
* @api {get} /fabric GET /fabric
* @apiVersion 1.0.0
* @apiName GET-/fabric
* @apiGroup Default
* @apiPermission Unknown
*
* @apidescription
*   No Description
*

*
*
*
* @apiSchema {jsonschema=../schema/res.TileJSON.json} apiSuccess
*/


/**
* @api {get} /fabric/:z/:x/:y.mvt GET /fabric/:z/:x/:y.mvt
* @apiVersion 1.0.0
* @apiName GET-/fabric/:z/:x/:y.mvt
* @apiGroup Default
* @apiPermission Unknown
*
* @apidescription
*   No Description
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
* @api {post} /github/event POST /github/event
* @apiVersion 1.0.0
* @apiName POST-/github/event
* @apiGroup Default
* @apiPermission Unknown
*
* @apidescription
*   No Description
*

*
*
*
*
*/


/**
* @api {get} /health GET /health
* @apiVersion 1.0.0
* @apiName GET-/health
* @apiGroup Default
* @apiPermission Unknown
*
* @apidescription
*   No Description
*

*
*
*
* @apiSchema {jsonschema=../schema/res.Health.json} apiSuccess
*/


/**
* @api {get} /job GET /job
* @apiVersion 1.0.0
* @apiName GET-/job
* @apiGroup Default
* @apiPermission Unknown
*
* @apidescription
*   No Description
*

*
* @apiSchema (Query) {jsonschema=../schema/req.query.ListJobs.json} apiParam
*
* @apiSchema {jsonschema=../schema/res.ListJobs.json} apiSuccess
*/


/**
* @api {get} /job/:job GET /job/:job
* @apiVersion 1.0.0
* @apiName GET-/job/:job
* @apiGroup Default
* @apiPermission Unknown
*
* @apidescription
*   No Description
*
* @apiParam {integer} job param
*
*
*
* @apiSchema {jsonschema=../schema/res.Job.json} apiSuccess
*/


/**
* @api {get} /job/:job/raw GET /job/:job/raw
* @apiVersion 1.0.0
* @apiName GET-/job/:job/raw
* @apiGroup Default
* @apiPermission Unknown
*
* @apidescription
*   No Description
*
* @apiParam {integer} job param
*
*
*
*
*/


/**
* @api {post} /job/:job/rerun POST /job/:job/rerun
* @apiVersion 1.0.0
* @apiName POST-/job/:job/rerun
* @apiGroup Default
* @apiPermission Unknown
*
* @apidescription
*   No Description
*
* @apiParam {integer} job param
*
*
*
* @apiSchema {jsonschema=../schema/res.SingleJobsCreate.json} apiSuccess
*/


/**
* @api {get} /job/:job/delta GET /job/:job/delta
* @apiVersion 1.0.0
* @apiName GET-/job/:job/delta
* @apiGroup Default
* @apiPermission Unknown
*
* @apidescription
*   No Description
*
* @apiParam {integer} job param
*
*
*
* @apiSchema {jsonschema=../schema/res.SingleDelta.json} apiSuccess
*/


/**
* @api {get} /job/:job/output/source.png GET /job/:job/output/source.png
* @apiVersion 1.0.0
* @apiName GET-/job/:job/output/source.png
* @apiGroup Default
* @apiPermission Unknown
*
* @apidescription
*   No Description
*
* @apiParam {integer} job param
*
*
*
*
*/


/**
* @api {get} /job/:job/output/validated.geojson.gz GET /job/:job/output/validated.geojson.gz
* @apiVersion 1.0.0
* @apiName GET-/job/:job/output/validated.geojson.gz
* @apiGroup Default
* @apiPermission Unknown
*
* @apidescription
*   No Description
*
* @apiParam {integer} job param
*
*
*
*
*/


/**
* @api {get} /job/:job/output/source.geojson.gz GET /job/:job/output/source.geojson.gz
* @apiVersion 1.0.0
* @apiName GET-/job/:job/output/source.geojson.gz
* @apiGroup Default
* @apiPermission Unknown
*
* @apidescription
*   No Description
*
* @apiParam {integer} job param
*
*
*
*
*/


/**
* @api {get} /job/:job/output/sample GET /job/:job/output/sample
* @apiVersion 1.0.0
* @apiName GET-/job/:job/output/sample
* @apiGroup Default
* @apiPermission Unknown
*
* @apidescription
*   No Description
*
* @apiParam {integer} job param
*
*
*
*
*/


/**
* @api {get} /job/:job/output/cache.zip GET /job/:job/output/cache.zip
* @apiVersion 1.0.0
* @apiName GET-/job/:job/output/cache.zip
* @apiGroup Default
* @apiPermission Unknown
*
* @apidescription
*   No Description
*
* @apiParam {integer} job param
*
*
*
*
*/


/**
* @api {get} /job/:job/log GET /job/:job/log
* @apiVersion 1.0.0
* @apiName GET-/job/:job/log
* @apiGroup Default
* @apiPermission Unknown
*
* @apidescription
*   No Description
*
* @apiParam {integer} job param
*
* @apiSchema (Query) {jsonschema=../schema/req.query.SingleLog.json} apiParam
*
* @apiSchema {jsonschema=../schema/res.SingleLog.json} apiSuccess
*/


/**
* @api {patch} /job/:job PATCH /job/:job
* @apiVersion 1.0.0
* @apiName PATCH-/job/:job
* @apiGroup Default
* @apiPermission Unknown
*
* @apidescription
*   No Description
*
* @apiParam {integer} job param
*
*
* @apiSchema (Body) {jsonschema=../schema/req.body.PatchJob.json} apiParam
* @apiSchema {jsonschema=../schema/res.Job.json} apiSuccess
*/


/**
* @api {get} /level GET /level
* @apiVersion 1.0.0
* @apiName GET-/level
* @apiGroup Default
* @apiPermission Unknown
*
* @apidescription
*   No Description
*

*
* @apiSchema (Query) {jsonschema=../schema/req.query.ListLevelOverride.json} apiParam
*
* @apiSchema {jsonschema=../schema/res.ListLevelOverride.json} apiSuccess
*/


/**
* @api {post} /level POST /level
* @apiVersion 1.0.0
* @apiName POST-/level
* @apiGroup Default
* @apiPermission Unknown
*
* @apidescription
*   No Description
*

*
*
* @apiSchema (Body) {jsonschema=../schema/req.body.CreateLevelOverride.json} apiParam
* @apiSchema {jsonschema=../schema/res.LevelOverride.json} apiSuccess
*/


/**
* @api {patch} /level/:levelid PATCH /level/:levelid
* @apiVersion 1.0.0
* @apiName PATCH-/level/:levelid
* @apiGroup Default
* @apiPermission Unknown
*
* @apidescription
*   No Description
*
* @apiParam {integer} levelid param
*
*
* @apiSchema (Body) {jsonschema=../schema/req.body.PatchLevelOverride.json} apiParam
* @apiSchema {jsonschema=../schema/res.LevelOverride.json} apiSuccess
*/


/**
* @api {get} /level/:levelid GET /level/:levelid
* @apiVersion 1.0.0
* @apiName GET-/level/:levelid
* @apiGroup Default
* @apiPermission Unknown
*
* @apidescription
*   No Description
*
* @apiParam {integer} levelid param
*
*
*
* @apiSchema {jsonschema=../schema/res.LevelOverride.json} apiSuccess
*/


/**
* @api {delete} /level/:levelid DELETE /level/:levelid
* @apiVersion 1.0.0
* @apiName DELETE-/level/:levelid
* @apiGroup Default
* @apiPermission Unknown
*
* @apidescription
*   No Description
*
* @apiParam {integer} levelid param
*
*
*
* @apiSchema {jsonschema=../schema/res.Standard.json} apiSuccess
*/


/**
* @api {get} /login/verify GET /login/verify
* @apiVersion 1.0.0
* @apiName GET-/login/verify
* @apiGroup Default
* @apiPermission Unknown
*
* @apidescription
*   No Description
*

*
* @apiSchema (Query) {jsonschema=../schema/req.query.VerifyLogin.json} apiParam
*
* @apiSchema {jsonschema=../schema/res.Standard.json} apiSuccess
*/


/**
* @api {get} /login GET /login
* @apiVersion 1.0.0
* @apiName GET-/login
* @apiGroup Default
* @apiPermission Unknown
*
* @apidescription
*   No Description
*

*
* @apiSchema (Query) {jsonschema=../schema/req.query.GetLogin.json} apiParam
*
* @apiSchema {jsonschema=../schema/res.Login.json} apiSuccess
*/


/**
* @api {post} /login POST /login
* @apiVersion 1.0.0
* @apiName POST-/login
* @apiGroup Default
* @apiPermission Unknown
*
* @apidescription
*   No Description
*

*
*
* @apiSchema (Body) {jsonschema=../schema/req.body.CreateLogin.json} apiParam
* @apiSchema {jsonschema=../schema/res.Login.json} apiSuccess
*/


/**
* @api {post} /login/forgot POST /login/forgot
* @apiVersion 1.0.0
* @apiName POST-/login/forgot
* @apiGroup Default
* @apiPermission Unknown
*
* @apidescription
*   No Description
*

*
*
* @apiSchema (Body) {jsonschema=../schema/req.body.ForgotLogin.json} apiParam
* @apiSchema {jsonschema=../schema/res.Standard.json} apiSuccess
*/


/**
* @api {post} /login/reset POST /login/reset
* @apiVersion 1.0.0
* @apiName POST-/login/reset
* @apiGroup Default
* @apiPermission Unknown
*
* @apidescription
*   No Description
*

*
*
* @apiSchema (Body) {jsonschema=../schema/req.body.ResetLogin.json} apiParam
* @apiSchema {jsonschema=../schema/res.Standard.json} apiSuccess
*/


/**
* @api {get} /map GET /map
* @apiVersion 1.0.0
* @apiName GET-/map
* @apiGroup Default
* @apiPermission Unknown
*
* @apidescription
*   No Description
*

*
*
*
*
*/


/**
* @api {get} /map/features GET /map/features
* @apiVersion 1.0.0
* @apiName GET-/map/features
* @apiGroup Default
* @apiPermission Unknown
*
* @apidescription
*   No Description
*

*
*
*
*
*/


/**
* @api {get} /map/:mapid GET /map/:mapid
* @apiVersion 1.0.0
* @apiName GET-/map/:mapid
* @apiGroup Default
* @apiPermission Unknown
*
* @apidescription
*   No Description
*
* @apiParam {integer} mapid param
*
*
*
*
*/


/**
* @api {get} /map/:z/:x/:y.mvt GET /map/:z/:x/:y.mvt
* @apiVersion 1.0.0
* @apiName GET-/map/:z/:x/:y.mvt
* @apiGroup Default
* @apiPermission Unknown
*
* @apidescription
*   No Description
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
* @api {post} /opencollective/event POST /opencollective/event
* @apiVersion 1.0.0
* @apiName POST-/opencollective/event
* @apiGroup Default
* @apiPermission Unknown
*
* @apidescription
*   No Description
*

*
*
*
*
*/


/**
* @api {get} /run GET /run
* @apiVersion 1.0.0
* @apiName GET-/run
* @apiGroup Default
* @apiPermission Unknown
*
* @apidescription
*   No Description
*

*
* @apiSchema (Query) {jsonschema=../schema/req.query.ListRuns.json} apiParam
*
* @apiSchema {jsonschema=../schema/res.ListRuns.json} apiSuccess
*/


/**
* @api {post} /run POST /run
* @apiVersion 1.0.0
* @apiName POST-/run
* @apiGroup Default
* @apiPermission Unknown
*
* @apidescription
*   No Description
*

*
*
* @apiSchema (Body) {jsonschema=../schema/req.body.CreateRun.json} apiParam
* @apiSchema {jsonschema=../schema/res.Run.json} apiSuccess
*/


/**
* @api {get} /run/:run GET /run/:run
* @apiVersion 1.0.0
* @apiName GET-/run/:run
* @apiGroup Default
* @apiPermission Unknown
*
* @apidescription
*   No Description
*
* @apiParam {integer} run param
*
*
*
* @apiSchema {jsonschema=../schema/res.Run.json} apiSuccess
*/


/**
* @api {get} /run/:run/count GET /run/:run/count
* @apiVersion 1.0.0
* @apiName GET-/run/:run/count
* @apiGroup Default
* @apiPermission Unknown
*
* @apidescription
*   No Description
*
* @apiParam {integer} run param
*
*
*
* @apiSchema {jsonschema=../schema/res.RunStats.json} apiSuccess
*/


/**
* @api {patch} /run/:run PATCH /run/:run
* @apiVersion 1.0.0
* @apiName PATCH-/run/:run
* @apiGroup Default
* @apiPermission Unknown
*
* @apidescription
*   No Description
*
* @apiParam {integer} run param
*
*
* @apiSchema (Body) {jsonschema=../schema/req.body.PatchRun.json} apiParam
* @apiSchema {jsonschema=../schema/res.Run.json} apiSuccess
*/


/**
* @api {post} /run/:run/jobs POST /run/:run/jobs
* @apiVersion 1.0.0
* @apiName POST-/run/:run/jobs
* @apiGroup Default
* @apiPermission Unknown
*
* @apidescription
*   No Description
*
* @apiParam {integer} run param
*
*
* @apiSchema (Body) {jsonschema=../schema/req.body.SingleJobsCreate.json} apiParam
* @apiSchema {jsonschema=../schema/res.SingleJobsCreate.json} apiSuccess
*/


/**
* @api {get} /run/:run/jobs GET /run/:run/jobs
* @apiVersion 1.0.0
* @apiName GET-/run/:run/jobs
* @apiGroup Default
* @apiPermission Unknown
*
* @apidescription
*   No Description
*
* @apiParam {integer} run param
*
*
*
* @apiSchema {jsonschema=../schema/res.SingleJobs.json} apiSuccess
*/


/**
* @api {post} /schedule POST /schedule
* @apiVersion 1.0.0
* @apiName POST-/schedule
* @apiGroup Default
* @apiPermission Unknown
*
* @apidescription
*   No Description
*

*
*
* @apiSchema (Body) {jsonschema=../schema/req.body.Schedule.json} apiParam
* @apiSchema {jsonschema=../schema/res.Standard.json} apiSuccess
*/


/**
* @api {get} /token GET /token
* @apiVersion 1.0.0
* @apiName GET-/token
* @apiGroup Default
* @apiPermission Unknown
*
* @apidescription
*   No Description
*

*
*
*
* @apiSchema {jsonschema=../schema/res.ListTokens.json} apiSuccess
*/


/**
* @api {post} /token POST /token
* @apiVersion 1.0.0
* @apiName POST-/token
* @apiGroup Default
* @apiPermission Unknown
*
* @apidescription
*   No Description
*

*
*
* @apiSchema (Body) {jsonschema=../schema/req.body.CreateToken.json} apiParam
* @apiSchema {jsonschema=../schema/res.CreateToken.json} apiSuccess
*/


/**
* @api {delete} /token/:id DELETE /token/:id
* @apiVersion 1.0.0
* @apiName DELETE-/token/:id
* @apiGroup Default
* @apiPermission Unknown
*
* @apidescription
*   No Description
*
* @apiParam {integer} id param
*
*
*
* @apiSchema {jsonschema=../schema/res.Standard.json} apiSuccess
*/


/**
* @api {post} /upload POST /upload
* @apiVersion 1.0.0
* @apiName POST-/upload
* @apiGroup Default
* @apiPermission Unknown
*
* @apidescription
*   No Description
*

*
*
*
* @apiSchema {jsonschema=../schema/res.Standard.json} apiSuccess
*/


/**
* @api {get} /user GET /user
* @apiVersion 1.0.0
* @apiName GET-/user
* @apiGroup Default
* @apiPermission Unknown
*
* @apidescription
*   No Description
*

*
*
*
* @apiSchema {jsonschema=../schema/res.ListUsers.json} apiSuccess
*/


/**
* @api {post} /user POST /user
* @apiVersion 1.0.0
* @apiName POST-/user
* @apiGroup Default
* @apiPermission Unknown
*
* @apidescription
*   No Description
*

*
*
* @apiSchema (Body) {jsonschema=../schema/req.body.CreateUser.json} apiParam
* @apiSchema {jsonschema=../schema/res.User.json} apiSuccess
*/


/**
* @api {get} /user/:id GET /user/:id
* @apiVersion 1.0.0
* @apiName GET-/user/:id
* @apiGroup Default
* @apiPermission Unknown
*
* @apidescription
*   No Description
*
* @apiParam {integer} id param
*
* @apiSchema (Query) {jsonschema=../schema/req.query.SingleUser.json} apiParam
*
* @apiSchema {jsonschema=../schema/res.User.json} apiSuccess
*/


/**
* @api {patch} /user/:id PATCH /user/:id
* @apiVersion 1.0.0
* @apiName PATCH-/user/:id
* @apiGroup Default
* @apiPermission Unknown
*
* @apidescription
*   No Description
*
* @apiParam {integer} id param
*
*
* @apiSchema (Body) {jsonschema=../schema/req.body.PatchUser.json} apiParam
* @apiSchema {jsonschema=../schema/res.User.json} apiSuccess
*/
