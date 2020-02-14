#!/usr/bin/env bash
# based on github.com/mapbox/lambda-cfn

# ./util/upload-lambda lambda-directory bucket/prefix

GITSHA=$(git rev-parse HEAD)
echo "ok - ${GITSHA}"

zip -qr /tmp/${GITSHA}.zip $(dirname $0)/../lambda/*
aws s3 cp /tmp/${GITSHA}.zip s3://openaddresses-lambdas/batch/${GITSHA}.zip
rm /tmp/${GITSHA}.zip
