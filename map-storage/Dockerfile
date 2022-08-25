# The building of ProtoBuf "messages" must be done out of Docker because grpc-node does not ship with ARM64 binaries.
# See: https://github.com/grpc/grpc-node/issues/1405
# When the issue above is closed, we can move back messages building inside Dockerfile

# protobuf build
FROM --platform=$BUILDPLATFORM node:16.15-buster-slim@sha256:9ad2f889d4a15ef94e40ac75e95c28daa34073dbc25d7b1e619caacc6b83623c as proto-builder
WORKDIR /usr/src
COPY messages/yarn.lock messages/package.json ./
RUN yarn install
COPY messages .
RUN yarn run tag-version && yarn ts-proto-nest

# typescript build
FROM --platform=$BUILDPLATFORM node:16.15-buster-slim@sha256:9ad2f889d4a15ef94e40ac75e95c28daa34073dbc25d7b1e619caacc6b83623c as builder
WORKDIR /usr/src
COPY map-storage/yarn.lock map-storage/package.json ./
RUN yarn install
COPY map-storage .
COPY --from=proto-builder /usr/src/ts-proto-nest-generated src/Messages/ts-proto-nest-generated
COPY --from=proto-builder /usr/src/protos/* src/Messages/protos/
ENV NODE_ENV=production
RUN yarn run build

# final production image
FROM node:16.15-buster-slim@sha256:9ad2f889d4a15ef94e40ac75e95c28daa34073dbc25d7b1e619caacc6b83623c
WORKDIR /usr/src
COPY map-storage/yarn.lock map-storage/package.json ./
ENV NODE_ENV=production
RUN yarn install --production
COPY --from=builder /usr/src/dist /usr/src/dist
COPY --from=builder /usr/src/public /usr/src/public

USER node
CMD ["yarn", "run", "start:prod"]
