FROM ubuntu:19.10

EXPOSE 5000

ENV HOME=/home/openaddresses
WORKDIR $HOME
COPY ./ $HOME/api
WORKDIR $HOME/api



RUN apt-get update -y \
    && apt-get install -y git curl \
    && curl 'https://nodejs.org/dist/v13.8.0/node-v13.8.0-linux-x64.tar.gz' | tar -xzv \
    && cp ./node-v13.8.0-linux-x64/bin/node /usr/bin/ \
    && ./node-v13.8.0-linux-x64/bin/npm install -g npm \
    && npm install -g yarn \
    && yarn install

CMD yarn start
