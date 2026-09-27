import { sql } from 'drizzle-orm';
import { geometry, GeometryType, jsonb } from '@openaddresses/batch-generic';
import { bigint, bigserial, boolean, foreignKey, index, pgTable, text, timestamp, unique } from 'drizzle-orm/pg-core';

// DrizzleORM table definitions - the source of truth for ./migrations
// Index & constraint names match what the original Knex migrations created
// so the baseline migration is a no-op against an existing database.

export const User = pgTable('users', {
    id: bigserial({ mode: 'number' }).primaryKey(),
    created: timestamp({ mode: 'date' }).default(sql`NOW()`),
    level: text().notNull().default('basic'),
    access: text().notNull(),
    flags: jsonb().notNull(),
    username: text().notNull(),
    email: text().notNull(),
    password: text().notNull(),
    validated: boolean().notNull().default(false),
    oc_contribution_id: text(),
}, t => [
    unique('users_username_key').on(t.username),
    unique('users_email_key').on(t.email),
]);

export const UserToken = pgTable('users_tokens', {
    id: bigserial({ mode: 'number' }),
    name: text(),
    token: text().primaryKey(),
    created: timestamp({ mode: 'date' }),
    uid: bigint({ mode: 'number' }),
});

export const UserReset = pgTable('users_reset', {
    uid: bigint({ mode: 'number' }),
    expires: timestamp({ mode: 'date' }),
    token: text(),
    action: text(),
});

export const JobError = pgTable('job_errors', {
    job: bigint({ mode: 'number' }).notNull(),
    message: text().notNull(),
});

export const Map = pgTable('map', {
    id: bigserial({ mode: 'number' }).primaryKey(),
    name: text(),
    code: text(),
    geom: geometry({ type: GeometryType.Geometry, srid: 4326 }),
});

export const Collection = pgTable('collections', {
    id: bigserial({ mode: 'number' }).primaryKey(),
    size: bigint({ mode: 'number' }),
    name: text().notNull(),
    sources: jsonb(),
    created: timestamp({ mode: 'date' }),
    human: text(),
    processed_size: bigint({ mode: 'number' }),
}, t => [
    unique('collections_name_key').on(t.name),
]);

export const Run = pgTable('runs', {
    id: bigserial({ mode: 'number' }).primaryKey(),
    live: boolean(),
    created: timestamp({ mode: 'date' }).default(sql`NOW()`),
    github: jsonb().default({}),
    closed: boolean().default(false),
}, t => [
    index('runs_live_idx').on(t.live),
]);

export const Job = pgTable('job', {
    id: bigserial({ mode: 'number' }).primaryKey(),
    size: bigint({ mode: 'number' }),
    license: text().default('false'),
    run: bigint({ mode: 'number' }),
    map: bigint({ mode: 'number' }),
    created: timestamp({ mode: 'date' }).default(sql`NOW()`),
    source: text(),
    source_name: text(),
    layer: text(),
    name: text(),
    output: jsonb(),
    loglink: text(),
    status: text().default('Pending'),
    stats: jsonb().default({}),
    count: bigint({ mode: 'number' }),
    bounds: geometry({ type: GeometryType.Polygon, srid: 4326 }),
    version: text(),
}, t => [
    index('job_map_idx').on(t.map),
    index('job_run_idx').on(t.run),
    index('job_created_idx').on(t.created),
    index('job_status_id_idx').on(t.status, t.id),
    index('job_source_name_layer_name_idx').on(t.source_name, t.layer, t.name),
]);

export const Data = pgTable('results', {
    id: bigserial({ mode: 'number' }).primaryKey(),
    fabric: boolean().default(false),
    source: text(),
    updated: timestamp({ mode: 'date' }),
    layer: text(),
    name: text(),
    job: bigint({ mode: 'number' }),
}, t => [
    foreignKey({ name: 'results_job_fk', columns: [t.job], foreignColumns: [Job.id] }),
    index('results_source_layer_name_idx').on(t.source, t.layer, t.name),
]);

export const Export = pgTable('exports', {
    id: bigserial({ mode: 'number' }).primaryKey(),
    uid: bigint({ mode: 'number' }).notNull(),
    job_id: bigint({ mode: 'number' }).notNull(),
    format: text().notNull(),
    created: timestamp({ mode: 'date' }).notNull().default(sql`NOW()`),
    expiry: timestamp({ mode: 'date' }).notNull().default(sql`NOW() + '1 week'`),
    size: bigint({ mode: 'number' }),
    status: text().notNull().default('Pending'),
    loglink: text(),
});

export const LevelOverride = pgTable('level_override', {
    id: bigserial({ mode: 'number' }).primaryKey(),
    created: timestamp({ mode: 'date' }).default(sql`NOW()`),
    updated: timestamp({ mode: 'date' }).default(sql`NOW()`),
    level: text().notNull(),
    pattern: text().notNull(),
});
