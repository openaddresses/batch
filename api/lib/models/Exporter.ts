import Modeler from '@openaddresses/batch-generic';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import type { InferSelectModel } from 'drizzle-orm';
import type { Response } from 'express';
import Err from '@openaddresses/batch-error';
import { sql, eq, and, gt, lt, desc, inArray } from 'drizzle-orm';
import moment from 'moment';
import CloudWatchLogs from '@aws-sdk/client-cloudwatch-logs';
import { Export, Job } from '../schema.js';
import { Status } from '../util.js';
import { trigger } from '../batch.js';
import R2 from '../r2.js';
import type { AuthObject } from '../auth.js';
import type { ListExportQueryType, SingleLogResponseType } from '../types.js';

const cwl = new CloudWatchLogs.CloudWatchLogsClient({ region: process.env.AWS_DEFAULT_REGION });

export type ExportRow = InferSelectModel<typeof Export>;

export default class ExporterModel extends Modeler<typeof Export> {
    constructor(pool: PostgresJsDatabase<Record<string, unknown>>) {
        super(pool, Export);
    }

    /**
     * List & Filter Exports
     */
    async list(query: Partial<ListExportQueryType> = {}) {
        const limit = query.limit || 100;
        const page = query.page || 0;
        const statuses = query.status ? [query.status] : Status.list();
        Status.verify(statuses);

        const after = parseDate(query.after, 'after');
        const before = parseDate(query.before, 'before');

        const pgres = await this.pool.select({
            count: sql<string>`count(*) OVER()`,
            id: Export.id,
            job_id: Export.job_id,
            uid: Export.uid,
            status: Export.status,
            format: Export.format,
            created: Export.created,
            expiry: Export.expiry,
            loglink: Export.loglink,
            size: Export.size,
            source_name: Job.source_name,
            layer: Job.layer,
            name: Job.name,
        })
            .from(Export)
            .leftJoin(Job, eq(Job.id, Export.job_id))
            .where(and(
                inArray(Export.status, statuses),
                query.uid ? eq(Export.uid, Number(query.uid)) : undefined,
                after ? gt(Export.created, after) : undefined,
                before ? lt(Export.created, before) : undefined,
            ))
            .orderBy(desc(Export.created))
            .limit(limit)
            .offset(page * limit);

        return {
            total: pgres.length ? parseInt(pgres[0].count) : 0,
            items: pgres.map((row) => {
                const { count, ...rest } = row;
                void count;
                return rest;
            }),
        };
    }

    /**
     * Count the number of exports the user has performed this month
     */
    async monthly(uid: number | string): Promise<number> {
        return await this.count({
            where: sql`
                uid = ${uid}
                AND created > date_trunc('month', NOW())
            `,
        });
    }

    async data(auth: AuthObject, export_id: number, res: Response): Promise<void> {
        const exp = await this.from(export_id);

        if (auth.access !== 'admin' && auth.uid !== exp.uid) throw new Err(401, null, 'Not Authorized to download');
        if (exp.status !== 'Success') throw new Err(400, null, 'Cannot download an unsuccessful export');

        const r2 = new R2({
            Bucket: process.env.R2Bucket || 'openaddresses',
            Key: `v2.openaddresses.io/${process.env.StackName}/export/${export_id}/export.zip`,
        });

        return res.redirect(await r2.url());
    }

    /**
     * Submit the Export to AWS Batch for processing
     */
    async batch(exp: ExportRow): Promise<boolean> {
        if (!exp.id) throw new Err(400, null, 'Cannot batch an export without an ID');

        if (process.env.StackName === 'test') {
            return true;
        } else {
            try {
                await trigger({
                    type: 'export',
                    id: exp.id,
                    job: exp.job_id,
                    format: exp.format,
                });

                return true;
            } catch (err) {
                throw new Err(500, err instanceof Error ? err : new Error(String(err)), 'failed to submit export to batch');
            }
        }
    }

    async log(exp: ExportRow): Promise<SingleLogResponseType> {
        if (!exp.loglink) throw new Err(404, null, 'Export has not produced a log');

        try {
            const res = await cwl.send(new CloudWatchLogs.GetLogEventsCommand({
                logGroupName: '/aws/batch/job',
                logStreamName: exp.loglink,
            }));

            let line = 0;
            return (res.events ?? []).map((event) => {
                return {
                    id: ++line,
                    timestamp: event.timestamp ?? 0,
                    message: event.message ?? '',
                };
            });
        } catch (err) {
            throw new Err(500, err instanceof Error ? err : new Error(String(err)), 'Could not retrieve logs');
        }
    }
}

function parseDate(value: string | undefined, name: string): Date | null {
    if (!value) return null;

    const date = moment(value);
    if (!date.isValid()) throw new Err(400, null, `${name} param is not recognized as a valid date`);

    return date.toDate();
}
