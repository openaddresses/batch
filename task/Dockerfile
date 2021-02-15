FROM alpine:3.11

RUN apk add nodejs npm git python3 python3-dev py3-pip \
    py3-gdal gdal gdal-dev make bash sqlite-dev zlib-dev \
    postgresql-libs gcc g++ musl-dev postgresql-dev cairo \
    py3-cairo jq

WORKDIR /usr/local/src/batch
ADD . /usr/local/src/batch

# Install Machine Process One Script
RUN git clone --depth 1 --branch $(jq -rc '.external["batch-machine"]' package.json) --single-branch https://github.com/openaddresses/batch-machine.git \
    && pip3 install 'honcho == 1.0.1' 'virtualenv == 15.1.0' \
    && pip3 install psycopg2 \
    && pip3 install -U ./batch-machine/

# Download and install Tippecanoe
RUN git clone --depth 1 --branch $(jq -rc .external.tippecanoe package.json) --single-branch https://github.com/mapbox/tippecanoe.git /tmp/tippecanoe && \
    cd /tmp/tippecanoe && \
    make && \
    PREFIX=/usr/local make install && \
    rm -rf /tmp/tippecanoe

RUN npm install
