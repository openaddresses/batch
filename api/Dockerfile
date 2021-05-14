FROM ubuntu:20.04

EXPOSE 5000

ENV HOME=/home/openaddresses
WORKDIR $HOME
COPY ./ $HOME/api
WORKDIR $HOME/api

RUN apt-get update \
    && DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends tzdata \
    && apt-get install -y nginx curl memcached

RUN export NODEV='16.1.0' \
    && curl "https://nodejs.org/dist/v${NODEV}-v${NODEV}-linux-x64.tar.gz" | tar -xzv \
    && cp ./node-v${NODEV}-linux-x64/bin/node /usr/bin/ \
    && ./node-v${NODEV}-linux-x64/bin/npm install -g npm

RUN cp ./nginx.conf /etc/nginx/sites-enabled/default

RUN npm install -g npm@7 \
    && npm install -g yarn \
    && npm install \
    && npm run doc

RUN cd web \
    && yarn install \
    && npm run build \
    && cd ..

CMD service nginx restart \
    && service memcached restart \
    && npm run start
