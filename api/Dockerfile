FROM ubuntu:22.04

EXPOSE 5000

ENV HOME=/home/openaddresses
WORKDIR $HOME

RUN apt-get update \
    && DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends tzdata \
    && apt-get install -y nginx curl memcached python3 build-essential

RUN export NODEV='18.10.0' \
    && curl "https://nodejs.org/dist/v${NODEV}/node-v${NODEV}-linux-x64.tar.gz" | tar -xzv \
    && cp ./node-v${NODEV}-linux-x64/bin/node /usr/bin/ \
    && ./node-v${NODEV}-linux-x64/bin/npm install -g npm

COPY ./ $HOME/api
WORKDIR $HOME/api

RUN cp ./nginx.conf /etc/nginx/sites-enabled/default

RUN npm install

RUN cd web \
    && npm install -g yarn \
    && yarn install --ignore-engines \
    && NODE_OPTIONS=--openssl-legacy-provider npm run build \
    && cd ..

CMD service nginx restart \
    && service memcached restart \
    && npm run start
