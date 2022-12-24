FROM node:18-alpine3.16 AS node
FROM 847904970422.dkr.ecr.us-east-1.amazonaws.com/batch-machine:8.0.0

COPY --from=node /usr/lib /usr/lib
COPY --from=node /usr/local/share /usr/local/share
COPY --from=node /usr/local/lib /usr/local/lib
COPY --from=node /usr/local/include /usr/local/include
COPY --from=node /usr/local/bin /usr/local/bin

WORKDIR /usr/local/src/batch
ADD . /usr/local/src/batch

RUN npm install
