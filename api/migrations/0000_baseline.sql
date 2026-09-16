CREATE EXTENSION IF NOT EXISTS postgis;--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "collections" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"size" bigint,
	"name" text NOT NULL,
	"sources" jsonb,
	"created" timestamp,
	"human" text,
	"processed_size" bigint,
	CONSTRAINT "collections_name_key" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "results" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"fabric" boolean DEFAULT false,
	"source" text,
	"updated" timestamp,
	"layer" text,
	"name" text,
	"job" bigint
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "exports" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"uid" bigint NOT NULL,
	"job_id" bigint NOT NULL,
	"format" text NOT NULL,
	"created" timestamp DEFAULT NOW() NOT NULL,
	"expiry" timestamp DEFAULT NOW() + '1 week' NOT NULL,
	"size" bigint,
	"status" text DEFAULT 'Pending' NOT NULL,
	"loglink" text
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "job" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"size" bigint,
	"license" text DEFAULT 'false',
	"run" bigint,
	"map" bigint,
	"created" timestamp DEFAULT NOW(),
	"source" text,
	"source_name" text,
	"layer" text,
	"name" text,
	"output" jsonb,
	"loglink" text,
	"status" text DEFAULT 'Pending',
	"stats" jsonb DEFAULT '{}'::jsonb,
	"count" bigint,
	"bounds" GEOMETRY(POLYGON, 4326),
	"version" text
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "job_errors" (
	"job" bigint NOT NULL,
	"message" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "level_override" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"created" timestamp DEFAULT NOW(),
	"updated" timestamp DEFAULT NOW(),
	"level" text NOT NULL,
	"pattern" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "map" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"name" text,
	"code" text,
	"geom" GEOMETRY(GEOMETRY, 4326)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "runs" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"live" boolean,
	"created" timestamp DEFAULT NOW(),
	"github" jsonb DEFAULT '{}'::jsonb,
	"closed" boolean DEFAULT false
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "users" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"created" timestamp DEFAULT NOW(),
	"level" text DEFAULT 'basic' NOT NULL,
	"access" text NOT NULL,
	"flags" jsonb NOT NULL,
	"username" text NOT NULL,
	"email" text NOT NULL,
	"password" text NOT NULL,
	"validated" boolean DEFAULT false NOT NULL,
	CONSTRAINT "users_username_key" UNIQUE("username"),
	CONSTRAINT "users_email_key" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "users_reset" (
	"uid" bigint,
	"expires" timestamp,
	"token" text,
	"action" text
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "users_tokens" (
	"id" bigserial NOT NULL,
	"name" text,
	"token" text PRIMARY KEY NOT NULL,
	"created" timestamp,
	"uid" bigint
);
--> statement-breakpoint
DO $$ BEGIN
ALTER TABLE "results" ADD CONSTRAINT "results_job_fk" FOREIGN KEY ("job") REFERENCES "public"."job"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "results_source_layer_name_idx" ON "results" USING btree ("source","layer","name");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "job_map_idx" ON "job" USING btree ("map");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "job_run_idx" ON "job" USING btree ("run");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "job_created_idx" ON "job" USING btree ("created");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "job_status_id_idx" ON "job" USING btree ("status","id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "job_source_name_layer_name_idx" ON "job" USING btree ("source_name","layer","name");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "runs_live_idx" ON "runs" USING btree ("live");