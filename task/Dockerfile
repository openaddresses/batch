FROM node:26-alpine3.24 AS node
FROM 847904970422.dkr.ecr.us-east-1.amazonaws.com/batch-machine:11.0.0

COPY --from=node /usr/lib /usr/lib
COPY --from=node /usr/local/share /usr/local/share
COPY --from=node /usr/local/lib /usr/local/lib
COPY --from=node /usr/local/include /usr/local/include
COPY --from=node /usr/local/bin /usr/local/bin

WORKDIR /usr/local/src/batch
ADD . /usr/local/src/batch

RUN npm install --allow-git=root

# Pre-fetch DuckDB's spatial extension (used by lib/parquet.js) so jobs don't
# depend on reaching extensions.duckdb.org at runtime.
RUN node --input-type=module -e "import { DuckDBInstance } from '@duckdb/node-api'; const i = await DuckDBInstance.create(':memory:'); const c = await i.connect(); await c.run('INSTALL spatial'); c.closeSync(); i.closeSync();"
