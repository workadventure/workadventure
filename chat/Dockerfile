# The building of ProtoBuf "messages" must be done out of Docker because grpc-node does not ship with ARM64 binaries.
# See: https://github.com/grpc/grpc-node/issues/1405
# When the issue above is closed, we can move back messages building inside Dockerfile

# protobuf build
FROM --platform=$BUILDPLATFORM node:16.15-buster-slim@sha256:9ad2f889d4a15ef94e40ac75e95c28daa34073dbc25d7b1e619caacc6b83623c as proto-builder
WORKDIR /usr/src
COPY messages/yarn.lock messages/package.json ./
RUN yarn install
COPY messages .
COPY libs ./../libs
RUN yarn run tag-version && yarn run ts-proto

# typescript build
FROM --platform=$BUILDPLATFORM node:16.15-buster-slim@sha256:9ad2f889d4a15ef94e40ac75e95c28daa34073dbc25d7b1e619caacc6b83623c as builder
WORKDIR /usr/src
COPY libs/tailwind/yarn.lock libs/tailwind/package.json ./../libs/tailwind/
RUN cd ../libs/tailwind && yarn install --network-timeout 1000000
COPY libs/messages/yarn.lock libs/messages/package.json ./../libs/messages/
RUN cd ../libs/messages && yarn install --network-timeout 1000000
COPY libs ./../libs
COPY --from=proto-builder /usr/libs/messages/src ./../libs/messages/src
COPY chat/yarn.lock chat/package.json ./
RUN yarn install --network-timeout 1000000
RUN cd /usr/libs/messages && yarn run build && yarn run prepare-for-prod
COPY chat .

# upgrade RAM available to 6G
RUN yarn run typesafe-i18n && NODE_OPTIONS="--max-old-space-size=6144" yarn build

RUN mv /usr/src/dist/index.html /usr/src/dist/index.tpl.html

# final production image
FROM nginx:1.21.6-alpine

RUN rm /usr/share/nginx/html/index.html
COPY chat/nginx.conf /etc/nginx/conf.d/default.conf
COPY chat/templater.sh /
COPY chat/start_nginx.sh /start_nginx.sh

COPY --from=builder /usr/src/dist /usr/share/nginx/html
COPY --from=builder /usr/src/server.template.json /usr/share/nginx/html/server.template.json

EXPOSE 80
CMD ["/start_nginx.sh"]
