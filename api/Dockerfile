FROM ubuntu:20.04

EXPOSE 5000

ENV HOME=/home/openaddresses
WORKDIR $HOME
COPY ./ $HOME/api
WORKDIR $HOME/api

RUN apt-get update \
    && apt-get install -y nginx curl

RUN curl 'https://nodejs.org/dist/v14.15.4/node-v14.15.4-linux-x64.tar.gz' | tar -xzv \
    && cp ./node-v14.15.4-linux-x64/bin/node /usr/bin/ \
    && ./node-v14.15.4-linux-x64/bin/npm install -g npm

RUN cp ./nginx.conf /etc/nginx/sites-enabled/default

RUN npm install -g npm@7 \
    && npm install yarn \
    && npm install \
    && npm run doc

RUN cd web \
    && yarn install \
    && npm run build \
    && cd ..

CMD service nginx restart \
    && npm run start
