# protobuf build
FROM node:14.18.2-buster-slim@sha256:20bedf0c09de887379e59a41c04284974f5fb529cf0e13aab613473ce298da3d as builder
WORKDIR /usr/src
COPY messages/yarn.lock messages/package.json ./
RUN yarn install
COPY messages .
RUN yarn ts-proto

# typescript build
FROM node:14.18.2-buster-slim@sha256:20bedf0c09de887379e59a41c04284974f5fb529cf0e13aab613473ce298da3d as builder2
WORKDIR /usr/src
COPY front/yarn.lock front/package.json ./
RUN yarn install
COPY front .
COPY --from=builder /usr/src/ts-proto-generated/protos src/Messages/ts-proto-generated
RUN sed -i 's/import { Observable } from "rxjs";/import type { Observable } from "rxjs";/g' src/Messages/ts-proto-generated/messages.ts
COPY --from=builder /usr/src/JsonMessages src/Messages/JsonMessages
RUN yarn run typesafe-i18n && yarn run build-iframe-api && yarn build

# final production image
FROM thecodingmachine/nodejs:14-apache

USER root
RUN DEBIAN_FRONTEND=noninteractive apt-get update \
    && apt-get install -y \
    gettext-base \
    && rm -rf /var/lib/apt/lists/*
USER docker

COPY --from=builder2 --chown=docker:docker /usr/src/dist dist
COPY front/templater.sh .

ENV STARTUP_COMMAND_0="./templater.sh"
ENV STARTUP_COMMAND_1="envsubst < dist/env-config.template.js > dist/env-config.js"
ENV APACHE_DOCUMENT_ROOT=dist/
