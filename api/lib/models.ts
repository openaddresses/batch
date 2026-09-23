import Modeler from '@openaddresses/batch-generic';
import type { Pool } from '@openaddresses/batch-generic';
import Collection from './models/Collection.js';
import Data from './models/Data.js';
import Exporter from './models/Exporter.js';
import Job from './models/Job.js';
import JobError from './models/JobError.js';
import LevelOverride from './models/LevelOverride.js';
import Map from './models/Map.js';
import Run from './models/Run.js';
import * as pgtypes from './schema.js';

export default class Models {
    User: Modeler<typeof pgtypes.User>;
    UserToken: Modeler<typeof pgtypes.UserToken>;
    UserReset: Modeler<typeof pgtypes.UserReset>;
    Collection: Collection;
    Data: Data;
    Exporter: Exporter;
    Job: Job;
    JobError: JobError;
    LevelOverride: LevelOverride;
    Map: Map;
    Run: Run;

    constructor(pg: Pool<typeof pgtypes>) {
        this.User = new Modeler(pg, pgtypes.User);
        this.UserToken = new Modeler(pg, pgtypes.UserToken);
        this.UserReset = new Modeler(pg, pgtypes.UserReset);

        this.Collection = new Collection(pg);
        this.Data = new Data(pg);
        this.Exporter = new Exporter(pg);
        this.Job = new Job(pg);
        this.JobError = new JobError(pg);
        this.LevelOverride = new LevelOverride(pg);
        this.Map = new Map(pg);
        this.Run = new Run(pg);
    }
}
