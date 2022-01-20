FROM node:14.18.2-buster-slim@sha256:20bedf0c09de887379e59a41c04284974f5fb529cf0e13aab613473ce298da3d as builder
WORKDIR /usr/src
COPY messages .
RUN yarn install && yarn ts-proto

# we are rebuilding on each deploy to cope with the PUSHER_URL environment URL
FROM thecodingmachine/nodejs:14-apache

COPY --chown=docker:docker front .
COPY --from=builder --chown=docker:docker /usr/src/ts-proto-generated/protos /var/www/html/src/Messages/ts-proto-generated
RUN sed -i 's/import { Observable } from "rxjs";/import type { Observable } from "rxjs";/g' /var/www/html/src/Messages/ts-proto-generated/messages.ts
COPY --from=builder --chown=docker:docker /usr/src/JsonMessages /var/www/html/src/Messages/JsonMessages

# Removing the iframe.html file from the final image as this adds a XSS attack.
# iframe.html is only in dev mode to circumvent a limitation
RUN rm dist/iframe.html

RUN yarn install

ENV NODE_ENV=production
ENV STARTUP_COMMAND_0="./templater.sh"
ENV STARTUP_COMMAND_1="yarn run build"
ENV APACHE_DOCUMENT_ROOT=dist/
