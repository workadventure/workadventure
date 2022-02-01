FROM node:14.18.2-buster-slim@sha256:20bedf0c09de887379e59a41c04284974f5fb529cf0e13aab613473ce298da3d as builder

WORKDIR /usr/src/messages
COPY messages .
RUN yarn install && yarn ts-proto

WORKDIR /usr/src/front
COPY front .

# move messages to front
RUN cp -r ../messages/ts-proto-generated/protos/* src/Messages/ts-proto-generated
RUN sed -i 's/import { Observable } from "rxjs";/import type { Observable } from "rxjs";/g' src/Messages/ts-proto-generated/messages.ts
RUN cp -r ../messages/JsonMessages/* src/Messages/JsonMessages

RUN yarn install && yarn run typesafe-i18n && yarn build

# Removing the iframe.html file from the final image as this adds a XSS attack.
# iframe.html is only in dev mode to circumvent a limitation
RUN rm dist/iframe.html

FROM thecodingmachine/nodejs:14-apache

COPY --from=builder --chown=docker:docker /usr/src/front/dist dist
COPY front/templater.sh .

USER root
RUN DEBIAN_FRONTEND=noninteractive apt-get update \
    && apt-get install -y \
    gettext-base \
    && rm -rf /var/lib/apt/lists/*
USER docker

ENV STARTUP_COMMAND_0="./templater.sh"
ENV STARTUP_COMMAND_1="envsubst < dist/env-config.template.js > dist/env-config.js"
ENV APACHE_DOCUMENT_ROOT=dist/
