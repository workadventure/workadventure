# The building of ProtoBuf "messages" must be done out of Docker because grpc-node does not ship with ARM64 binaries.
# See: https://github.com/grpc/grpc-node/issues/1405
# When the issue above is closed, we can move back messages building inside Dockerfile

# protobuf build
FROM --platform=$BUILDPLATFORM node:16.15-buster-slim@sha256:9ad2f889d4a15ef94e40ac75e95c28daa34073dbc25d7b1e619caacc6b83623c as proto-builder
WORKDIR /usr/src
COPY messages/package-lock.json messages/package.json ./
RUN npm install
COPY messages .
COPY libs ./../libs
RUN npm run tag-version && npm run ts-proto

# typescript build
FROM --platform=$BUILDPLATFORM node:16.15-buster-slim@sha256:9ad2f889d4a15ef94e40ac75e95c28daa34073dbc25d7b1e619caacc6b83623c as builder
WORKDIR /usr/src
RUN apt-get update && apt-get install -y git
COPY .yarn/releases .yarn/releases
COPY .yarn/plugins .yarn/plugins
COPY package.json yarn.lock .yarnrc.yml ./
COPY chat/package.json chat/package.json
COPY libs/messages/package.json libs/messages/package.json
COPY libs/map-editor/package.json libs/map-editor/package.json
COPY libs/math-utils/package.json libs/math-utils/package.json
COPY libs/tailwind/package.json libs/tailwind/package.json
RUN yarn workspaces focus workadventurechat
COPY libs ./libs
COPY --from=proto-builder /usr/libs/messages/src ./libs/messages/src
COPY chat ./chat

# upgrade RAM available to 6G
RUN cd chat && yarn run typesafe-i18n && NODE_OPTIONS="--max-old-space-size=6144" yarn build

RUN mv /usr/src/chat/dist/index.html /usr/src/chat/dist/index.tpl.html

# final production image
FROM nginx:1.21.6-alpine

RUN rm /usr/share/nginx/html/index.html
COPY chat/nginx.conf /etc/nginx/conf.d/default.conf
COPY chat/templater.sh /
COPY chat/start_nginx.sh /start_nginx.sh

COPY --from=builder /usr/src/chat/dist /usr/share/nginx/html
COPY --from=builder /usr/src/chat/server.template.json /usr/share/nginx/html/server.template.json

EXPOSE 80
CMD ["/start_nginx.sh"]
