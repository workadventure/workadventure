# The building of ProtoBuf "messages" must be done out of Docker because grpc-node does not ship with ARM64 binaries.
# See: https://github.com/grpc/grpc-node/issues/1405
# When the issue above is closed, we can move back messages building inside Dockerfile

# protobuf build
FROM --platform=$BUILDPLATFORM node:16.15-buster-slim@sha256:9ad2f889d4a15ef94e40ac75e95c28daa34073dbc25d7b1e619caacc6b83623c as proto-builder
WORKDIR /usr/src
COPY messages/yarn.lock messages/package.json ./
RUN yarn install
COPY messages .
RUN yarn run tag-version && yarn run ts-proto

# typescript build
FROM --platform=$BUILDPLATFORM node:16.15-buster-slim@sha256:9ad2f889d4a15ef94e40ac75e95c28daa34073dbc25d7b1e619caacc6b83623c as builder
WORKDIR /usr/src
COPY libs/tailwind/yarn.lock libs/tailwind/package.json ./../libs/tailwind/
RUN cd ../libs/tailwind && yarn install --network-timeout 1000000
COPY libs/map-editor/yarn.lock libs/map-editor/package.json ./../libs/map-editor/
RUN cd ../libs/map-editor && yarn install --network-timeout 1000000
COPY libs/math-utils/yarn.lock libs/math-utils/package.json ./../libs/math-utils/
RUN cd ../libs/math-utils && yarn install --network-timeout 1000000
COPY libs ./../libs
COPY front/yarn.lock front/package.json ./
RUN yarn install --network-timeout 1000000
COPY front .

COPY --from=proto-builder /usr/src/ts-proto-generated src/Messages/ts-proto-generated
RUN sed -i 's/import { Observable } from "rxjs";/import type { Observable } from "rxjs";/g' src/Messages/ts-proto-generated/protos/messages.ts
COPY --from=proto-builder /usr/src/JsonMessages src/Messages/JsonMessages

# upgrade RAM available to 6G
RUN yarn run typesafe-i18n && yarn run build-iframe-api && NODE_OPTIONS="--max-old-space-size=6144" yarn build

RUN mv /usr/src/dist/index.html /usr/src/dist/index.tpl.html

# final production image
FROM nginx:1.21.6-alpine

RUN rm /usr/share/nginx/html/index.html
COPY front/nginx.conf /etc/nginx/conf.d/default.conf
COPY front/templater.sh /
COPY front/start_nginx.sh /start_nginx.sh

COPY --from=builder /usr/src/dist /usr/share/nginx/html
COPY --from=builder /usr/src/server.template.json /usr/share/nginx/html/server.template.json

EXPOSE 80
CMD ["/start_nginx.sh"]
