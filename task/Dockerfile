FROM 847904970422.dkr.ecr.us-east-1.amazonaws.com/batch-machine:7.9.0

RUN apk add nodejs npm yarn git jq

WORKDIR /usr/local/src/batch
ADD . /usr/local/src/batch

RUN npm install
