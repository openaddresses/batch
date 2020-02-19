FROM ubuntu:19.10

RUN rm /bin/sh && ln -s /bin/bash /bin/sh
ENV SHELL /bin/bash

RUN apt-get update -y \
    && apt-get install -y git curl \
    && curl 'https://nodejs.org/dist/v13.8.0/node-v13.8.0-linux-x64.tar.gz' | tar -xzv \
    && cp ./node-v13.8.0-linux-x64/bin/node /usr/bin/ \
    && ./node-v13.8.0-linux-x64/bin/npm install -g npm \
    && npm install -g yarn

# Install Machine Process One Script
RUN git clone --depth 1 https://github.com/openaddresses/machine.git \
    && apt-get install -y software-properties-common \
    && apt-get update -y \
    && apt-get install -y python3-pip python3-cairo libgeos-c1v5 \
        libgdal20 python3-gdal \
        python3-pip python3-dev libpq-dev memcached libffi-dev \
        gdal-bin libgdal-dev \
    && apt-get install -y git build-essential libsqlite3-dev protobuf-compiler libprotobuf-dev \
    && pip3 install 'honcho == 1.0.1' 'virtualenv == 15.1.0' \
    && pip3 install -U ./machine/

# Download and install Tippecanoe
RUN git clone -b 1.35.0 https://github.com/mapbox/tippecanoe.git /tmp/tippecanoe && \
    cd /tmp/tippecanoe && \
    make && \
    PREFIX=/usr/local make install && \
    rm -rf /tmp/tippecanoe


WORKDIR /usr/local/src/batch
ADD . /usr/local/src/batch

RUN yarn install

CMD 
