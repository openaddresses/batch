Table "analytics" {
  "ts" timestamp
  "sid" TEXT
  "ip" TEXT
  "agent" TEXT
  "method" TEXT
  "url" TEXT
}

Table "session" {
  "sid" VARCHAR
  "sess" JSON [not null]
  "expire" timestamp(6) [not null]
}

Table "users" {
  "id" BIGSERIAL [pk]
  "access" TEXT [not null]
  "flags" JSONB [not null]
  "username" TEXT [unique, not null]
  "email" TEXT [unique, not null]
  "password" TEXT [not null]
}

Table "users_tokens" {
  "id" BIGSERIAL
  "name" TEXT
  "token" TEXT [pk]
  "created" timestamp
  "uid" BIGINT
}

Table "job_errors" {
  "job" BIGINT [unique, not null]
  "message" TEXT [not null]
}

Table "map" {
  "id" BIGSERIAL
  "name" TEXT
  "code" TEXT
  "geom" "GEOMETRY(GEOMETRY, 4326)"
}

Table "collections" {
  "id" BIGSERIAL
  "name" TEXT [unique, not null]
  "sources" JSONB
  "created" timestamp
}

Table "results" {
  "id" BIGSERIAL
  "source" TEXT
  "updated" timestamp
  "layer" TEXT
  "name" TEXT
  "job" BIGINT
}

Table "job" {
  "id" BIGSERIAL [pk]
  "run" BIGINT
  "map" BIGINT
  "created" timestamp
  "source" TEXT
  "source_name" TEXT
  "layer" TEXT
  "name" TEXT
  "output" JSONB
  "loglink" TEXT
  "status" TEXT
  "stats" JSONB
  "count" BIGINT
  "bounds" "GEOMETRY(POLYGON, 4326)"
  "version" TEXT
}

Table "runs" {
  "id" BIGSERIAL [pk]
  "live" BOOLEAN
  "created" timestamp
  "github" JSONB
  "closed" BOOL
}

Table "users_reset" {
  "uid" BIGINT
  "expires" timestamp
  "token" TEXT
}


Ref: "users"."id" < "users_tokens"."uid"

Ref: "users"."id" < "users_reset"."uid"

Ref: "job_errors"."job" < "job"."id"

Ref: "job"."run" < "runs"."id"

Ref: "job"."map" < "map"."id"

Ref: "session"."sess" < "users"."id"

Ref: "results"."job" < "job"."id"
