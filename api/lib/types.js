import { Type } from '@sinclair/typebox';

// OpenAPI style string enum - keeps `enum` in the emitted JSON Schema
// rather than the anyOf/const form produced by Type.Union of literals
function StringEnum(values, options = {}) {
    return Type.Unsafe({
        type: 'string',
        enum: values,
        ...options
    });
}

// A bare `{ type: 'object' }` - Type.Object({}) would emit `properties: {}`
// which makes the route validator (removeAdditional: 'all') strip every key
function AnyObject(options = {}) {
    return Type.Unsafe({
        type: 'object',
        ...options
    });
}

// Shared Primitives

export const AccessValues = ['user', 'disabled', 'admin'];
export const Access = StringEnum(AccessValues, {
    description: 'The access level of a given user'
});

export const LevelValues = ['basic', 'backer', 'sponsor'];
export const Level = StringEnum(LevelValues, {
    description: 'The level of donation of a given user'
});

export const StatusValues = ['Pending', 'Running', 'Success', 'Fail', 'Warn'];
export const Status = StringEnum(StatusValues, {
    description: 'The current status of a given task'
});

export const Format = StringEnum(['shapefile', 'csv'], {
    description: 'Formats that can be exported to'
});

export const Order = StringEnum(['desc', 'asc'], {
    default: 'asc',
    description: 'Sort order to apply to results'
});

export const Created = Type.String({
    description: 'The ISO 8601 timestamp at which the resource was created'
});

export const Updated = Type.Union([Type.Null(), Type.String()], {
    description: 'The ISO 8601 timestamp at which the resource was last updated'
});

export const Size = Type.Union([Type.Null(), Type.Integer()], {
    description: 'The size of the asset in bytes'
});

export const Loglink = Type.Union([Type.Null(), Type.String()], {
    description: 'The AWS Cloudwatch Log ID of an AWS Batch run - note these logs expire'
});

export const Page = Type.Integer({
    default: 0,
    minimum: 0,
    description: 'The page, based on the limit, to return'
});

export const Limit = Type.Integer({
    default: 100,
    maximum: 100,
    description: 'Limit number of returned results'
});

export const Output = Type.Object({
    cache: Type.Boolean(),
    output: Type.Boolean(),
    preview: Type.Boolean(),
    validated: Type.Boolean(),
    pmtiles: Type.Optional(Type.Boolean())
}, {
    additionalProperties: false
});

export const Polygon = Type.Object({
    type: Type.Literal('Polygon'),
    coordinates: Type.Array(
        Type.Array(Type.Tuple([Type.Number(), Type.Number()]), { minItems: 5 }),
        { minItems: 1, maxItems: 1 }
    )
}, {
    additionalProperties: false
});

export const RunGithub = Type.Object({
    ref: Type.String({ description: 'Git reference (branch) of the given run' }),
    sha: Type.String({ description: 'Git SHA of the given run' }),
    url: Type.String({ description: 'Github URL to the specific commit' }),
    check: Type.Integer({ description: 'Github check ID to update' })
}, {
    description: 'Used by the data-pls CI tool',
    additionalProperties: false
});

// Request Bodies

export const CreateCollectionBody = Type.Object({
    name: Type.String({
        description: 'Human-Readable name of the collection',
        minLength: 1,
        pattern: '^[a-z0-9-]+$'
    }),
    sources: Type.Array(Type.String()),
    size: Type.Optional(Size)
}, {
    additionalProperties: false
});

export const PatchCollectionBody = Type.Object({
    name: Type.Optional(Type.String({
        minLength: 1,
        pattern: '^[a-z0-9-]+$'
    })),
    sources: Type.Optional(Type.Array(Type.String())),
    size: Type.Optional(Size),
    processed_size: Type.Optional(Size)
}, {
    additionalProperties: false
});

export const CreateExportBody = Type.Object({
    job_id: Type.Integer({ description: 'The Job ID to start an export task for' }),
    format: Format
}, {
    additionalProperties: false
});

export const PatchExportBody = Type.Object({
    size: Type.Optional(Size),
    status: Type.Optional(Status),
    loglink: Type.Optional(Loglink)
}, {
    additionalProperties: false
});

export const CreateLevelOverrideBody = Type.Object({
    pattern: Type.String({ description: 'RegExp pattern to match account emails' }),
    level: Level
}, {
    additionalProperties: false
});

export const PatchLevelOverrideBody = Type.Object({
    pattern: Type.Optional(Type.String({ description: 'RegExp pattern to match account emails' })),
    level: Type.Optional(Level)
}, {
    additionalProperties: false
});

export const CreateLoginBody = Type.Object({
    username: Type.String({ description: 'username' }),
    password: Type.String({ description: 'password' })
}, {
    additionalProperties: false
});

export const ForgotLoginBody = Type.Object({
    user: Type.String({ description: 'username or email to reset password of' })
}, {
    additionalProperties: false
});

export const ResetLoginBody = Type.Object({
    token: Type.String({ description: 'Email provided reset token' }),
    password: Type.String({ description: 'The new user password' })
}, {
    additionalProperties: false
});

export const CreateRunBody = Type.Object({
    live: Type.Optional(Type.Boolean()),
    github: Type.Optional(Type.Union([Type.Null(), AnyObject()]))
}, {
    additionalProperties: false
});

export const PatchRunBody = Type.Object({
    live: Type.Optional(Type.Boolean()),
    closed: Type.Optional(Type.Boolean()),
    github: Type.Optional(Type.Union([Type.Null(), AnyObject()]))
}, {
    additionalProperties: false
});

export const CreateTokenBody = Type.Object({
    name: Type.String({ description: 'Human Readable name of the API Token' })
}, {
    additionalProperties: false
});

export const CreateUserBody = Type.Object({
    username: Type.String({ description: 'username' }),
    password: Type.Optional(Type.String({ description: 'password' })),
    email: Type.Optional(Type.String({ description: 'email' }))
}, {
    additionalProperties: false
});

export const PatchUserBody = Type.Object({
    flags: Type.Optional(AnyObject()),
    access: Type.Optional(Access),
    validated: Type.Optional(Type.Boolean())
}, {
    additionalProperties: false
});

export const ErrorCreateBody = Type.Object({
    job: Type.Integer(),
    message: Type.String()
}, {
    additionalProperties: false
});

export const ErrorModerateBody = Type.Object({
    moderate: StringEnum(['confirm', 'reject'])
}, {
    additionalProperties: false
});

export const PatchDataBody = Type.Object({
    fabric: Type.Optional(Type.Boolean({ description: 'Should the source be included in the fabric' }))
}, {
    additionalProperties: false
});

export const PatchJobBody = Type.Object({
    size: Type.Optional(Size),
    map: Type.Optional(Type.Integer()),
    output: Type.Optional(AnyObject()),
    loglink: Type.Optional(Loglink),
    status: Type.Optional(Status),
    version: Type.Optional(Type.String()),
    stats: Type.Optional(AnyObject()),
    count: Type.Optional(Type.Integer()),
    bounds: Type.Optional(Type.Object({
        type: Type.Literal('Polygon'),
        coordinates: Type.Any()
    }, {
        additionalProperties: false
    }))
}, {
    additionalProperties: false
});

export const ScheduleBody = Type.Object({
    type: StringEnum(['cleanup', 'close', 'collect', 'fabric', 'level', 'scale', 'sources'])
}, {
    additionalProperties: false
});

export const SingleJobsCreateBody = Type.Object({
    jobs: Type.Array(Type.Union([
        Type.String(),
        Type.Object({
            source: Type.String(),
            layer: Type.String(),
            name: Type.String(),
            license: Type.Optional(Type.Union([AnyObject(), Type.Null()]))
        }, {
            additionalProperties: false
        })
    ]))
}, {
    additionalProperties: false
});

// Request Queries

export const DataHistoryQuery = Type.Object({
    status: Type.Optional(StringEnum(['Success', 'all'], {
        default: 'all',
        description: 'By default every job status (Pending, Running, Fail, Warn, Success) is returned, matching the dashboard\'s Job History table. Set to \'Success\' to only see successful runs'
    }))
}, {
    additionalProperties: false
});

export const ErrorListQuery = Type.Object({
    source: Type.Optional(Type.String({ description: 'Filter results by source name' })),
    layer: Type.Optional(Type.String({ description: 'Filter results by layer type' })),
    status: Type.Optional(Status),
    page: Type.Optional(Page),
    limit: Type.Optional(Type.Integer({ default: 100 })),
    order: Type.Optional(Order),
    sort: Type.Optional(StringEnum(['job', 'status', 'messages', 'source_name', 'layer', 'name'], {
        default: 'job',
        description: 'Field to sort order by'
    }))
}, {
    additionalProperties: false
});

export const GetLoginQuery = Type.Object({
    level: Type.Optional(Type.Boolean({ description: 'If true, refresh the user\'s level from OpenCollective' }))
}, {
    additionalProperties: false
});

export const SingleUserQuery = GetLoginQuery;

export const VerifyLoginQuery = Type.Object({
    token: Type.String({ description: 'The validation token which was emailed to you' })
}, {
    additionalProperties: false
});

export const ListDataQuery = Type.Object({
    source: Type.Optional(Type.String({ description: 'Filter results by source name' })),
    layer: Type.Optional(Type.String({ description: 'Filter results by layer type' })),
    validated: Type.Optional(Type.Boolean({ description: 'Filter data by whether a validated file has been produced' })),
    name: Type.Optional(Type.String({ description: 'Filter results by layer name' })),
    before: Type.Optional(Type.String({ description: 'Filter results updated before the given date' })),
    after: Type.Optional(Type.String({ description: 'Filter results updated after the given date' })),
    point: Type.Optional(Type.String({ description: 'Filter results by geographic point \'{lng},{lat}\'' })),
    fabric: Type.Optional(Type.Boolean({ description: 'Query results by fabric inclusion' })),
    map: Type.Optional(Type.Integer({ description: 'Filter by associated MapID' })),
    failing: Type.Optional(Type.Boolean({ description: 'Also include source/layer/names with no successful live-run job, so they can be discovered and debugged' }))
}, {
    additionalProperties: false
});

export const ListExportQuery = Type.Object({
    limit: Type.Optional(Limit),
    page: Type.Optional(Type.Integer({ description: 'Page of results to return' })),
    status: Type.Optional(Status),
    before: Type.Optional(Type.String({ description: 'Only show runs before the given date' })),
    after: Type.Optional(Type.String({ description: 'Only show runs after the given date' })),
    uid: Type.Optional(Type.String({ description: 'The User ID to show exports for - useful for admin only - user\'s can ownly see their own' }))
}, {
    additionalProperties: false
});

const CountQuery = Type.Boolean({
    default: true,
    description: 'Compute the exact total match count (count(*) OVER()). Set to false to skip this on callers that don\'t use the `total` response field and only sweep pages sequentially - it\'s otherwise recomputed on every page.'
});

export const ListJobsQuery = Type.Object({
    limit: Type.Optional(Limit),
    layer: Type.Optional(Type.String({ description: 'Filter results by layer type' })),
    run: Type.Optional(Type.Integer({ description: 'Only show run associated with a given ID' })),
    status: Type.Optional(Status),
    order: Type.Optional(Order),
    page: Type.Optional(Page),
    count: Type.Optional(CountQuery),
    cursor: Type.Optional(Type.Integer({ description: 'Keyset-paginate: only return jobs with id greater than this value, ordered by id ascending (overrides sort/order/page). Cheaper than page/limit for sweeping the full result set.' })),
    sort: Type.Optional(StringEnum([
        'id', 'run', 'map', 'created', 'source', 'source_name', 'layer', 'name', 'output',
        'loglink', 'status', 'stats', 'count', 'bounds', 'version', 'size', 'license'
    ], {
        default: 'id',
        description: 'Field to sort order by'
    })),
    live: Type.Optional(StringEnum(['all', 'true', 'false'], { default: 'all' })),
    before: Type.Optional(Type.String({ description: 'Only show runs before the given date' })),
    after: Type.Optional(Type.String({ description: 'Only show runs after the given date' })),
    source: Type.Optional(Type.String({ description: 'Filter results by source name' }))
}, {
    additionalProperties: false
});

export const ListOrphanedJobsQuery = Type.Object({
    before: Type.String({ description: 'Only return orphaned jobs created before this date' }),
    limit: Type.Optional(Limit),
    page: Type.Optional(Page),
    count: Type.Optional(CountQuery),
    cursor: Type.Optional(Type.Integer({ description: 'Keyset-paginate: only return jobs with id greater than this value (overrides page). Cheaper than page/limit for sweeping the full result set.' }))
}, {
    additionalProperties: false
});

export const ListLevelOverrideQuery = Type.Object({
    limit: Type.Optional(Limit),
    page: Type.Optional(Type.Integer({ description: 'The offset based on limit to return' })),
    filter: Type.Optional(Type.String({ description: 'Filter a complete or partial pattern' })),
    level: Type.Optional(Level)
}, {
    additionalProperties: false
});

export const ListRunsQuery = Type.Object({
    limit: Type.Optional(Limit),
    page: Type.Optional(Page),
    count: Type.Optional(CountQuery),
    cursor: Type.Optional(Type.Integer({ description: 'Keyset-paginate: only return runs with id greater than this value, ordered by id ascending (overrides sort/order/page). Cheaper than page/limit for sweeping the full result set.' })),
    order: Type.Optional(Order),
    sort: Type.Optional(StringEnum(['id', 'live', 'created', 'github', 'closed'], {
        default: 'id',
        description: 'Field to sort order by'
    })),
    run: Type.Optional(Type.Integer({ description: 'Only show run associated with a given ID' })),
    status: Type.Optional(Status),
    before: Type.Optional(Type.String({ description: 'Only show runs before the given date' })),
    after: Type.Optional(Type.String({ description: 'Only show runs after the given date' })),
    live: Type.Optional(Type.Boolean({ description: 'Filter runs by live status' }))
}, {
    additionalProperties: false
});

export const ListUsersQuery = Type.Object({
    limit: Type.Optional(Limit),
    page: Type.Optional(Page),
    filter: Type.Optional(Type.String({ default: '', description: 'Filter a complete or partial username/email' })),
    access: Type.Optional(Access),
    level: Type.Optional(Level),
    validated: Type.Optional(Type.Boolean({ description: 'Only show validated or unvalidated users' })),
    before: Type.Optional(Type.String({ description: 'Query users that were created before the given ISO Date' })),
    after: Type.Optional(Type.String({ description: 'Query users that were created after the given ISO Date' }))
}, {
    additionalProperties: false
});

export const SingleLogQuery = Type.Object({
    dl: Type.Optional(Type.Boolean({ description: 'Optional param to set content-disposition - forcing the browser to download' })),
    format: Type.Optional(StringEnum(['json', 'csv'], { default: 'json' }))
}, {
    additionalProperties: false
});

// Responses

export const StandardResponse = Type.Object({
    status: Type.Integer({ description: 'The HTTP Status Code of the response' }),
    message: Type.String({ description: 'A human readable status message' })
}, {
    additionalProperties: false
});

export const HealthResponse = Type.Object({
    healthy: Type.Boolean({ description: 'Is the service healthy?' }),
    message: Type.String({ description: 'The service on how it is doing' })
}, {
    additionalProperties: false
});

export const CollectionResponse = Type.Object({
    id: Type.Integer(),
    name: Type.String({ description: 'The name of the collection' }),
    human: Type.String({ description: 'The Human Readable name of the collection' }),
    sources: Type.Array(Type.String()),
    s3: Type.Optional(Type.String({ description: 'Sponsors have access to the direct S3 bucket' })),
    processed_s3: Type.Optional(Type.String({ description: 'Sponsors have access to the direct S3 bucket for the deduped/backfilled processed dataset' })),
    processed_size: Type.Optional(Size),
    created: Created,
    size: Size
}, {
    additionalProperties: false
});

export const ListCollectionsResponse = Type.Array(Type.Object({
    id: Type.Integer(),
    size: Size,
    name: Type.String(),
    human: Type.String(),
    created: Created,
    s3: Type.Optional(Type.String()),
    processed_s3: Type.Optional(Type.String()),
    processed_size: Type.Optional(Size),
    sources: Type.Any()
}, {
    additionalProperties: false
}));

export const CreateTokenResponse = Type.Object({
    id: Type.Integer(),
    name: Type.String({ description: 'Human Readable name of the API Token' }),
    token: Type.String(),
    created: Created
}, {
    additionalProperties: false
});

export const ListTokensResponse = Type.Object({
    total: Type.Integer({ description: 'Total number of users with the service' }),
    tokens: Type.Array(Type.Object({
        id: Type.Integer(),
        created: Created,
        name: Type.String()
    }, {
        additionalProperties: false
    }))
}, {
    additionalProperties: false
});

export const DataResponse = Type.Object({
    id: Type.Integer(),
    fabric: Type.Boolean(),
    source: Type.String(),
    updated: Updated,
    layer: Type.String(),
    name: Type.String(),
    job: Type.Integer(),
    s3: Type.Optional(Type.String({ description: 'Sponsors have access to the direct S3 bucket' })),
    size: Size,
    output: Output
}, {
    additionalProperties: false
});

export const ListDataResponse = Type.Array(Type.Object({
    id: Type.Integer({ description: 'Data ID' }),
    map: Type.Optional(Type.Integer({ description: 'Map ID that the job has been matched to' })),
    fabric: Type.Boolean(),
    source: Type.String(),
    updated: Updated,
    layer: Type.String(),
    name: Type.String(),
    job: Type.Integer(),
    latest_job: Type.Integer({ description: 'The most recent job for this source/layer/name, regardless of status - may differ from job if the last run failed' }),
    s3: Type.Optional(Type.String()),
    size: Size,
    output: Output
}, {
    additionalProperties: false
}));

export const DataHistoryResponse = Type.Object({
    id: Type.Integer(),
    jobs: Type.Array(Type.Object({
        id: Type.Integer(),
        created: Created,
        status: Status,
        s3: Type.String(),
        output: Output,
        count: Type.Integer(),
        stats: AnyObject(),
        run: Type.Integer(),
        map: Type.Optional(Type.Union([Type.Null(), Type.Integer()]))
    }, {
        additionalProperties: false
    }))
}, {
    additionalProperties: false
});

export const ErrorCountResponse = Type.Object({
    count: Type.Integer()
}, {
    additionalProperties: false
});

export const ErrorListResponse = Type.Object({
    total: Type.Integer(),
    errors: Type.Array(Type.Object({
        job: Type.Integer(),
        status: Status,
        messages: Type.Array(Type.String()),
        source_name: Type.String(),
        layer: Type.String(),
        name: Type.String()
    }, {
        additionalProperties: false
    }))
}, {
    additionalProperties: false
});

export const ErrorModerateResponse = Type.Object({
    job: Type.Integer(),
    moderate: StringEnum(['confirm', 'reject'])
}, {
    additionalProperties: false
});

export const JobErrorResponse = Type.Object({
    job: Type.Integer(),
    status: Type.Optional(Status),
    messages: Type.Array(Type.String()),
    source_name: Type.Optional(Type.String()),
    layer: Type.Optional(Type.String()),
    name: Type.Optional(Type.String())
}, {
    additionalProperties: false
});

export const ExportResponse = Type.Object({
    id: Type.Integer({ description: 'The integer ID of the export task' }),
    uid: Type.Integer({ description: 'The User ID that initiated the export task' }),
    job_id: Type.Integer({ description: 'The Job ID being exported' }),
    format: Format,
    created: Created,
    expiry: Type.String({ description: 'The ISO 8601 timestamp at which the export will expire' }),
    size: Size,
    status: Status,
    loglink: Loglink
}, {
    additionalProperties: false
});

export const ListExportResponse = Type.Object({
    total: Type.Integer({ description: 'The total number of exports in the account' }),
    exports: Type.Array(Type.Object({
        id: Type.Integer({ description: 'The integer ID of the export task' }),
        uid: Type.Integer({ description: 'The User ID that initiated the export task' }),
        job_id: Type.Integer({ description: 'The Job ID being exported' }),
        format: Format,
        created: Created,
        expiry: Type.String({ description: 'The ISO 8601 timestamp at which the export will expire' }),
        size: Size,
        status: Status,
        loglink: Loglink,
        source_name: Type.String(),
        layer: Type.String(),
        name: Type.String()
    }, {
        additionalProperties: false
    }))
}, {
    additionalProperties: false
});

export const JobResponse = Type.Object({
    id: Type.Integer(),
    license: Type.Union([Type.Boolean(), AnyObject()]),
    s3: Type.Optional(Type.Union([Type.Boolean(), Type.String()])),
    s3_validated: Type.Optional(Type.Union([Type.Boolean(), Type.String()])),
    run: Type.Integer(),
    map: Type.Union([Type.Null(), Type.Integer()]),
    created: Created,
    source: Type.String(),
    source_name: Type.String(),
    layer: Type.String(),
    name: Type.String(),
    output: Output,
    loglink: Loglink,
    status: Status,
    stats: AnyObject(),
    count: Type.Union([Type.Null(), Type.Integer()]),
    bounds: Type.Union([Polygon, Type.Null()]),
    version: Type.String({ description: 'The SemVer of the task processor for this job' }),
    size: Size,
    pmtiles_url: Type.Optional(Type.Union([Type.Null(), Type.String()]))
}, {
    additionalProperties: false
});

export const ListJobsResponse = Type.Object({
    total: Type.Integer(),
    jobs: Type.Array(Type.Object({
        id: Type.Integer(),
        run: Type.Integer(),
        map: Type.Union([Type.Null(), Type.Integer()]),
        created: Created,
        source: Type.String(),
        source_name: Type.String(),
        layer: Type.String(),
        name: Type.String(),
        output: Output,
        loglink: Loglink,
        status: Status,
        size: Size,
        pmtiles_url: Type.Optional(Type.Union([Type.Null(), Type.String()]))
    }, {
        additionalProperties: false
    }))
}, {
    additionalProperties: false
});

export const SingleJobsResponse = Type.Object({
    run: Type.Integer(),
    jobs: Type.Array(JobResponse)
}, {
    additionalProperties: false
});

export const SingleJobsCreateResponse = Type.Object({
    run: Type.Integer(),
    errors: Type.Optional(Type.Array(AnyObject())),
    jobs: Type.Array(Type.Integer())
}, {
    additionalProperties: false
});

const DeltaStats = Type.Object({
    id: Type.Integer(),
    count: Type.Integer(),
    stats: AnyObject(),
    bounds: Type.Object({
        area: Type.Number(),
        geom: AnyObject()
    }, {
        additionalProperties: false
    })
}, {
    additionalProperties: false
});

export const SingleDeltaResponse = Type.Object({
    compare: DeltaStats,
    master: DeltaStats,
    delta: Type.Object({
        count: Type.Integer(),
        stats: AnyObject(),
        bounds: AnyObject()
    }, {
        additionalProperties: false
    })
}, {
    additionalProperties: false
});

export const SingleLogResponse = Type.Array(Type.Object({
    id: Type.Integer({ description: 'The linenumber of the log message' }),
    timestamp: Type.Integer({ description: 'The time at which the particular line was generated' }),
    message: Type.String({ description: 'The log line itself' })
}, {
    additionalProperties: false
}));

export const LevelOverrideResponse = Type.Object({
    id: Type.Integer({ description: 'Unique ID' }),
    created: Created,
    updated: Updated,
    pattern: Type.String({ description: 'RegExp pattern to match account emails' }),
    level: Level
}, {
    additionalProperties: false
});

export const ListLevelOverrideResponse = Type.Object({
    total: Type.Integer(),
    level_override: Type.Array(LevelOverrideResponse)
}, {
    additionalProperties: false
});

export const LicensesResponse = Type.Object({
    licenses: Type.Array(Type.Object({
        attribution: Type.Union([Type.Null(), Type.String()]),
        license: Type.Union([Type.Null(), Type.String()]),
        url: Type.Union([Type.Null(), Type.String()]),
        sources: Type.Array(Type.Array(Type.Union([Type.Null(), Type.String()]), {
            minItems: 2,
            maxItems: 2
        }))
    }, {
        additionalProperties: false
    }))
}, {
    additionalProperties: false
});

export const RunResponse = Type.Object({
    id: Type.Integer(),
    live: Type.Boolean(),
    created: Created,
    closed: Type.Boolean(),
    github: Type.Optional(Type.Partial(RunGithub))
}, {
    additionalProperties: false
});

export const ListRunsResponse = Type.Object({
    total: Type.Integer(),
    runs: Type.Array(Type.Object({
        id: Type.Integer(),
        live: Type.Boolean({ description: 'If true, successful jobs immediately become the most recent live data' }),
        created: Created,
        github: RunGithub,
        closed: Type.Boolean({ description: 'Is the Run still accepting jobs' }),
        status: Status,
        jobs: Type.Integer({ description: 'The number of jobs in this run' })
    }, {
        additionalProperties: false
    }))
}, {
    additionalProperties: false
});

export const RunStatsResponse = Type.Object({
    run: Type.Integer(),
    status: Type.Object({
        Warn: Type.Integer(),
        Success: Type.Integer(),
        Pending: Type.Integer(),
        Fail: Type.Integer()
    }, {
        additionalProperties: false
    })
}, {
    additionalProperties: false
});

export const UserResponse = Type.Object({
    id: Type.Integer(),
    username: Type.String(),
    email: Type.String(),
    access: Access,
    level: Level,
    flags: AnyObject()
}, {
    additionalProperties: false
});

export const ListUsersResponse = Type.Object({
    total: Type.Integer({ description: 'Total number of users with the service' }),
    users: Type.Array(Type.Object({
        id: Type.Integer({ description: 'The users unique id' }),
        username: Type.String({ description: 'The users unique username' }),
        email: Type.String({ description: 'The users email address' }),
        access: Access,
        level: Level,
        flags: AnyObject(),
        validated: Type.Boolean()
    }, {
        additionalProperties: false
    }))
}, {
    additionalProperties: false
});

export const LoginResponse = Type.Object({
    uid: Type.Integer(),
    username: Type.String(),
    email: Type.String(),
    access: Access,
    level: Level,
    flags: AnyObject(),
    token: Type.Optional(Type.String())
}, {
    additionalProperties: false
});

export const TileJSONResponse = Type.Object({
    tilejson: StringEnum(['2.2.0', '2.1.0'], { description: 'TileJSON Spec Version' }),
    name: Type.String({ description: 'Unique name of layer' }),
    version: Type.String({ description: 'Style Version' }),
    scheme: StringEnum(['xyz'], { description: 'Tile format' }),
    tiles: Type.Array(Type.String({ description: 'Tile URL' }), { description: 'Array of tile URLs' }),
    bounds: Type.Array(Type.Number()),
    center: Type.Array(Type.Number())
});
