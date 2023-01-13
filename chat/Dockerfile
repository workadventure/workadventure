# The building of ProtoBuf "messages" must be done out of Docker because grpc-node does not ship with ARM64 binaries.
# See: https://github.com/grpc/grpc-node/issues/1405
# When the issue above is closed, we can move back messages building inside Dockerfile

# protobuf build
FROM --platform=$BUILDPLATFORM node:18.12.1-buster-slim@sha256:62798b0191c85e2fc5f06897e345a6c9e8902ea3beedcb8e07463c665c37526d as proto-builder
WORKDIR /usr/src
COPY messages/package-lock.json messages/package.json ./
RUN npm ci
COPY messages .
COPY libs ./../libs
RUN npm run tag-version && npm run ts-proto

# typescript build
FROM --platform=$BUILDPLATFORM node:18.12.1-buster-slim@sha256:62798b0191c85e2fc5f06897e345a6c9e8902ea3beedcb8e07463c665c37526d as builder
WORKDIR /usr/src
RUN apt-get update && apt-get install -y git
COPY package.json package-lock.json ./
COPY chat/package.json chat/package.json
COPY libs/messages/package.json libs/messages/package.json
COPY libs/map-editor/package.json libs/map-editor/package.json
COPY libs/math-utils/package.json libs/math-utils/package.json
COPY libs/tailwind/package.json libs/tailwind/package.json
COPY libs/store-utils/package.json libs/store-utils/package.json
RUN npm ci --workspace=workadventurechat
COPY libs ./libs
COPY --from=proto-builder /usr/libs/messages/src ./libs/messages/src
COPY chat ./chat

# upgrade RAM available to 6G
RUN cd chat && npm run typesafe-i18n && NODE_OPTIONS="--max-old-space-size=6144" npm run build

RUN mv /usr/src/chat/dist/index.html /usr/src/chat/dist/index.tpl.html

# final production image
FROM nginx:1.21.6-alpine

RUN rm /usr/share/nginx/html/index.html
COPY chat/nginx.conf /etc/nginx/conf.d/default.conf
COPY chat/templater.sh /
COPY chat/start_nginx.sh /start_nginx.sh

COPY --from=builder /usr/src/chat/dist /usr/share/nginx/html

EXPOSE 80
CMD ["/start_nginx.sh"]
