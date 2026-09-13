import { sql } from 'drizzle-orm';
import { geometry, GeometryType, jsonb } from '@openaddresses/batch-generic';
import { bigint, bigserial, boolean, pgTable, text, timestamp } from 'drizzle-orm/pg-core';

// DrizzleORM table definitions mirroring the Knex migrations in ./migrations
// Migrations remain the source of truth for the database - these definitions
// exist so batch-generic Modelers can read and write the existing tables.

export const User = pgTable('users', {
    id: bigserial({ mode: 'number' }).primaryKey(),
    created: timestamp({ mode: 'date' }).default(sql`NOW()`),
    level: text().notNull().default('basic'),
    access: text().notNull(),
    flags: jsonb().notNull(),
    username: text().notNull().unique(),
    email: text().notNull().unique(),
    password: text().notNull(),
    validated: boolean().notNull().default(false)
});

export const UserToken = pgTable('users_tokens', {
    id: bigserial({ mode: 'number' }),
    name: text(),
    token: text().primaryKey(),
    created: timestamp({ mode: 'date' }),
    uid: bigint({ mode: 'number' })
});

export const UserReset = pgTable('users_reset', {
    uid: bigint({ mode: 'number' }),
    expires: timestamp({ mode: 'date' }),
    token: text(),
    action: text()
});

export const JobError = pgTable('job_errors', {
    job: bigint({ mode: 'number' }).notNull(),
    message: text().notNull()
});

export const Map = pgTable('map', {
    id: bigserial({ mode: 'number' }).primaryKey(),
    name: text(),
    code: text(),
    geom: geometry({ type: GeometryType.Geometry, srid: 4326 })
});

export const Collection = pgTable('collections', {
    id: bigserial({ mode: 'number' }).primaryKey(),
    size: bigint({ mode: 'number' }),
    name: text().notNull().unique(),
    sources: jsonb(),
    created: timestamp({ mode: 'date' }),
    human: text(),
    processed_size: bigint({ mode: 'number' })
});

export const Run = pgTable('runs', {
    id: bigserial({ mode: 'number' }).primaryKey(),
    live: boolean(),
    created: timestamp({ mode: 'date' }).default(sql`NOW()`),
    github: jsonb().default({}),
    closed: boolean().default(false)
});

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
    version: text()
});

export const Data = pgTable('results', {
    id: bigserial({ mode: 'number' }).primaryKey(),
    fabric: boolean().default(false),
    source: text(),
    updated: timestamp({ mode: 'date' }),
    layer: text(),
    name: text(),
    job: bigint({ mode: 'number' }).references(() => Job.id)
});

export const Export = pgTable('exports', {
    id: bigserial({ mode: 'number' }).primaryKey(),
    uid: bigint({ mode: 'number' }).notNull(),
    job_id: bigint({ mode: 'number' }).notNull(),
    format: text().notNull(),
    created: timestamp({ mode: 'date' }).notNull().default(sql`NOW()`),
    expiry: timestamp({ mode: 'date' }).notNull().default(sql`NOW() + '1 week'`),
    size: bigint({ mode: 'number' }),
    status: text().notNull().default('Pending'),
    loglink: text()
});

export const LevelOverride = pgTable('level_override', {
    id: bigserial({ mode: 'number' }).primaryKey(),
    created: timestamp({ mode: 'date' }).default(sql`NOW()`),
    updated: timestamp({ mode: 'date' }).default(sql`NOW()`),
    level: text().notNull(),
    pattern: text().notNull()
});
