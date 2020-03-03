FROM alpine:3.11

EXPOSE 5000

ENV HOME=/home/openaddresses
WORKDIR $HOME
COPY ./ $HOME/api
WORKDIR $HOME/api

RUN apk add nodejs yarn
RUN yarn install

CMD yarn start
