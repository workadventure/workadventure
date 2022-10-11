# The building of ProtoBuf "messages" must be done out of Docker because grpc-node does not ship with ARM64 binaries.
# See: https://github.com/grpc/grpc-node/issues/1405
# When the issue above is closed, we can move back messages building inside Dockerfile

# protobuf build
FROM --platform=$BUILDPLATFORM node:16.15-buster-slim@sha256:9ad2f889d4a15ef94e40ac75e95c28daa34073dbc25d7b1e619caacc6b83623c as proto-builder
WORKDIR /usr/src
COPY messages/yarn.lock messages/package.json ./
RUN yarn install
COPY messages .
RUN yarn run tag-version && yarn proto

# typescript build
FROM --platform=$BUILDPLATFORM node:16.15-buster-slim@sha256:9ad2f889d4a15ef94e40ac75e95c28daa34073dbc25d7b1e619caacc6b83623c as builder
WORKDIR /usr/src
COPY libs/messages/yarn.lock libs/messages/package.json ./../libs/messages/
RUN cd ../libs/messages && yarn install --network-timeout 1000000
COPY libs ./../libs
COPY pusher/yarn.lock pusher/package.json ./
RUN yarn install
COPY pusher .
COPY --from=proto-builder /usr/src/generated src/Messages/generated
ENV NODE_ENV=production
RUN yarn run tsc

# final production image
FROM node:16.15-buster-slim@sha256:9ad2f889d4a15ef94e40ac75e95c28daa34073dbc25d7b1e619caacc6b83623c
WORKDIR /usr/src
COPY pusher/yarn.lock pusher/package.json ./
ENV NODE_ENV=production
RUN yarn install --production
COPY --from=builder /usr/src/dist /usr/src/dist
# Need to have the swagger ui dir be owned by the current user.
RUN chown node:node -R /usr/src/node_modules/swagger-ui-dist

USER node
CMD ["yarn", "run", "runprod"]
