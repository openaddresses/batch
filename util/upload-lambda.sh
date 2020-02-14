#!/usr/bin/env bash
# based on github.com/mapbox/lambda-cfn

# ./util/upload-lambda lambda-directory bucket/prefix

GITSHA=$(git rev-parse HEAD)

zip -qr ${GITSHA}.zip *
aws s3 cp $1.zip s3://openaddresses-lambdas/batch/${GITSHA}.zip
rm ${GITSHA}.zip
