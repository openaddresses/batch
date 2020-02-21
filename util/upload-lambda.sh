#!/usr/bin/env bash
# based on github.com/mapbox/lambda-cfn

# ./util/upload-lambda lambda-directory bucket/prefix

GITSHA=$(git rev-parse HEAD)
echo "ok - ${GITSHA}"

cd $(dirname $0)/../lambda/

yarn install

zip -qr /tmp/${GITSHA}.zip *

aws s3 cp /tmp/${GITSHA}.zip s3://openaddresses-lambdas/batch/${GITSHA}.zip

rm /tmp/${GITSHA}.zip
