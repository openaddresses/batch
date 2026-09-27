import Modeler, { Param, type GenericTable, type GenericList, type GenericListInput } from '@openaddresses/batch-generic';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import Err from '@openaddresses/batch-error';
import { sql, eq, and, desc } from 'drizzle-orm';
import type { SQL } from 'drizzle-orm';
import moment from 'moment';
import { Data, Job, Run } from '../schema.js';
import MapModel from './Map.js';
import type { ListDataQueryType } from '../types.js';
import type { JobAugmented } from './Job.js';

export interface DataListItem {
    id: number | null;
    fabric: boolean;
    source: string;
    updated: string | null;
    layer: string;
    name: string;
    job: number | null;
    latest_job: number | null;
    output: Record<string, boolean> | null;
    size: number | null;
    map: number | null;
    s3: string;
    [k: string]: unknown;
}

interface DataRawRow {
    id: number | string | null;
    fabric: boolean;
    source: string;
    updated: string | null;
    layer: string;
    name: string;
    job: number | string | null;
    latest_job: number | string | null;
    output: Record<string, boolean> | null;
    size: number | string | null;
    map: number | string | null;
    [k: string]: unknown;
}

export type DataListQuery = Partial<ListDataQueryType> & Partial<GenericListInput> & { exact?: boolean };

export default class DataModel extends Modeler<GenericTable> {
    map: MapModel;

    constructor(pool: PostgresJsDatabase<Record<string, unknown>>) {
        super(pool, Data);

        this.map = new MapModel(pool);
    }

    static s3(job: number | string | null): string {
        return `s3://${process.env.Bucket}/${process.env.StackName}/job/${job}/source.geojson.gz`;
    }

    async list(query: DataListQuery = {}): Promise<GenericList<DataListItem>> {
        const source = query.source || '';
        const layer = !query.layer || query.layer === 'all' ? '' : query.layer;
        const name = query.name || '';

        const before = query.before ? moment(query.before).format('YYYY-MM-DD') : null;
        const after = query.after ? moment(query.after).format('YYYY-MM-DD') : null;

        const map = query.map ? Number(query.map) : null;
        const fabric = query.fabric ? true : null;
        const validated = query.validated ? true : null;

        let point = '';
        if (query.point) {
            const coords = query.point.split(',');

            if (coords.length !== 2) {
                throw new Err(404, null, 'invalid point query');
            }

            point = `POINT(${coords.join(' ')})`;
        }

        let sourcePattern = source;
        let layerPattern = layer;
        let namePattern = name;

        if (!query.exact) {
            sourcePattern = `%${source}%`;
            layerPattern = `${layer}%`;
            namePattern = `${name}%`;
        }

        // Only the batch dashboard's listing view opts into "failing" rows (via
        // ?failing=true) - task/collect.js and task/fabric.js call this with no
        // query params to build the downloadable collections/fabric tiles, and
        // must keep seeing exactly the sources with real output they had before.
        // Data.update()/Job.delta() use exact:true as a "does a real results row
        // exist" lookup and must never see a synthetic failing row as a match.
        const includeFailing = !!query.failing && !query.exact;

        let pgres;
        try {
            // "failing" covers source/layer/name combos with no row in `results` -
            // i.e. the layer has never had a successful live-run job - so a
            // contributor has a way to discover and debug it. Restricted to
            // job.status = 'Fail' so a first job that's merely Pending/Running
            // doesn't get flagged as broken before it's had a chance to run.
            pgres = await this.pool.execute<DataRawRow>(sql`
                WITH failing AS (
                    SELECT DISTINCT ON (job.source_name, job.layer, job.name)
                        job.id,
                        job.source_name AS source,
                        job.layer,
                        job.name,
                        job.output,
                        job.size,
                        job.map
                    FROM
                        job
                            INNER JOIN runs ON job.run = runs.id
                    WHERE
                        runs.live = true
                        AND job.status = 'Fail'
                        AND ${includeFailing}::BOOLEAN = true
                        AND NOT EXISTS (
                            SELECT 1 FROM results
                            WHERE
                                results.source = job.source_name
                                AND results.layer = job.layer
                                AND results.name = job.name
                        )
                    ORDER BY
                        job.source_name,
                        job.layer,
                        job.name,
                        job.created DESC
                )
                SELECT
                    results.id,
                    results.fabric,
                    results.source,
                    results.updated,
                    results.layer,
                    results.name,
                    results.job,
                    (
                        SELECT latest.id
                        FROM job latest INNER JOIN runs latest_runs
                            ON latest.run = latest_runs.id
                        WHERE
                            latest_runs.live = true
                            AND latest.source_name = results.source
                            AND latest.layer = results.layer
                            AND latest.name = results.name
                        ORDER BY latest.created DESC
                        LIMIT 1
                    ) AS latest_job,
                    job.output,
                    job.size,
                    job.map
                FROM
                    results
                        INNER JOIN
                            job LEFT JOIN map
                                ON job.map = map.id
                            ON results.job = job.id
                WHERE
                    results.source ilike ${sourcePattern}
                    AND results.layer ilike ${layerPattern}
                    AND results.name ilike ${namePattern}
                    AND (${before}::TIMESTAMP IS NULL OR updated < ${before}::TIMESTAMP)
                    AND (${after}::TIMESTAMP IS NULL OR updated > ${after}::TIMESTAMP)
                    AND (${map}::BIGINT IS NULL OR job.map = ${map}::BIGINT)
                    AND (
                        char_length(${point}::TEXT) = 0
                        OR ST_DWithin(ST_SetSRID(ST_PointFromText(${point}::TEXT), 4326), map.geom, 1.0)
                    )
                    AND (${fabric}::BOOLEAN IS NULL OR results.fabric = ${!!fabric}::BOOLEAN)
                    AND (${validated}::BOOLEAN IS NULL OR (job.output->'validated')::BOOLEAN = ${!!validated}::BOOLEAN)

                UNION ALL

                SELECT
                    (-1 * failing.id) AS id,
                    false AS fabric,
                    failing.source,
                    NULL::TIMESTAMP AS updated,
                    failing.layer,
                    failing.name,
                    failing.id AS job,
                    failing.id AS latest_job,
                    failing.output,
                    failing.size,
                    failing.map
                FROM
                    failing
                        LEFT JOIN map ON failing.map = map.id
                WHERE
                    failing.source ilike ${sourcePattern}
                    AND failing.layer ilike ${layerPattern}
                    AND failing.name ilike ${namePattern}
                    AND ${before}::TIMESTAMP IS NULL
                    AND ${after}::TIMESTAMP IS NULL
                    AND (${map}::BIGINT IS NULL OR failing.map = ${map}::BIGINT)
                    AND (
                        char_length(${point}::TEXT) = 0
                        OR ST_DWithin(ST_SetSRID(ST_PointFromText(${point}::TEXT), 4326), map.geom, 1.0)
                    )
                    AND (${fabric}::BOOLEAN IS NULL OR ${!!fabric}::BOOLEAN = false)
                    AND (${validated}::BOOLEAN IS NULL OR (failing.output->'validated')::BOOLEAN = ${!!validated}::BOOLEAN)

                ORDER BY
                    source,
                    layer,
                    name
            `);
        } catch (err) {
            throw new Err(500, err instanceof Error ? err : new Error(String(err)), 'Failed to load data');
        }

        const items: DataListItem[] = [];
        for (const row of pgres) {
            items.push({
                id: num(row.id),
                fabric: row.fabric,
                source: row.source,
                updated: row.updated,
                layer: row.layer,
                name: row.name,
                job: num(row.job),
                latest_job: num(row.latest_job),
                output: row.output,
                size: num(row.size),
                map: num(row.map),
                s3: DataModel.s3(row.job),
            });
        }

        return {
            total: items.length,
            items,
        };
    }

    /**
     * Return a complete job history for a given data source
     * (jobs part of live run, defaulting to every job status)
     *
     * @param {Numeric} data_id - ID of data row
     * @param {String} [status=all] - 'all' (default) or 'Success' to only include successful jobs
     */
    async history(data_id: number, status = 'all') {
        let pgres;
        try {
            pgres = await this.pool.select({
                id: Job.id,
                created: Job.created,
                status: Job.status,
                output: Job.output,
                run: Job.run,
                count: sql<string>`COALESCE(${Job.count}, 0)`,
                stats: Job.stats,
                map: Job.map,
            })
                .from(Data)
                .innerJoin(Job, and(
                    eq(Job.source_name, Data.source),
                    eq(Job.layer, Data.layer),
                    eq(Job.name, Data.name),
                ))
                .innerJoin(Run, eq(Job.run, Run.id))
                .where(and(
                    eq(Run.live, true),
                    eq(Data.id, data_id),
                    status === 'all' ? undefined : eq(Job.status, 'Success'),
                ))
                .orderBy(desc(Job.created));
        } catch (err) {
            throw new Err(500, err instanceof Error ? err : new Error(String(err)), 'Failed to get data history');
        }

        if (!pgres.length) {
            throw new Err(404, null, 'No data by that id');
        }

        return {
            id: data_id,
            jobs: pgres.map((job) => {
                return {
                    ...job,
                    count: num(job.count),
                    s3: DataModel.s3(job.id),
                };
            }),
        };
    }

    async from(data_id: number) {
        let pgres;
        try {
            pgres = await this.pool.select({
                id: Data.id,
                source: Data.source,
                fabric: Data.fabric,
                updated: Data.updated,
                layer: Data.layer,
                name: Data.name,
                job: Data.job,
                output: Job.output,
                size: Job.size,
                map: Job.map,
            })
                .from(Data)
                .innerJoin(Job, eq(Data.job, Job.id))
                .where(eq(Data.id, data_id))
                .limit(1);
        } catch (err) {
            throw new Err(500, err instanceof Error ? err : new Error(String(err)), 'Failed to load data');
        }

        if (!pgres.length) {
            throw new Err(404, null, 'No data by that id');
        }

        const data = pgres[0];
        return { ...data, s3: DataModel.s3(data.job) };
    }

    /**
     * Record a successful job as the latest data for its source/layer/name
     */
    async update(job: JobAugmented, fabric?: boolean): Promise<boolean> {
        let data;
        try {
            data = await this.list({
                source: job.source_name,
                layer: job.layer,
                name: job.name,
                exact: true,
            });
        } catch (err) {
            throw new Err(500, err instanceof Error ? err : new Error(String(err)), 'Failed to fetch data');
        }

        try {
            await this.map.match(job);
        } catch (err) {
            throw new Err(500, err instanceof Error ? err : new Error(String(err)), 'Failed to match coverage');
        }

        if (data.total > 1) {
            throw new Err(500, null, 'More than 1 source matches job');
        } else if (data.total === 0) {
            try {
                await this.generate({
                    source: job.source_name,
                    layer: job.layer,
                    name: job.name,
                    job: job.id,
                    updated: sql`NOW()`,
                    fabric: !!fabric,
                });

                return true;
            } catch (err) {
                throw new Err(500, err instanceof Error ? err : new Error(String(err)), 'Failed to update data');
            }
        } else {
            try {
                await this.commit(and(
                    eq(Data.source, String(job.source_name)),
                    eq(Data.layer, String(job.layer)),
                    eq(Data.name, String(job.name)),
                ) as SQL, {
                    job: job.id,
                    updated: sql`NOW()`,
                    fabric: sql`COALESCE(${Param(fabric || null)}::BOOLEAN, ${Data.fabric}, False)`,
                });

                return true;
            } catch (err) {
                throw new Err(500, err instanceof Error ? err : new Error(String(err)), 'Failed to update data');
            }
        }
    }
}

function num(value: number | string | null | undefined): number | null {
    if (value === null || value === undefined) return null;
    return Number(value);
}
