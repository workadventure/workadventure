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
RUN apt-get update && apt-get install -y jq
COPY libs/tailwind/yarn.lock libs/tailwind/package.json /usr/libs/tailwind/
RUN cd /usr/libs/tailwind && yarn install --network-timeout 1000000
COPY libs/math-utils/yarn.lock libs/math-utils/package.json /usr/libs/math-utils/
RUN cd /usr/libs/math-utils && yarn install --network-timeout 1000000
COPY libs/messages/yarn.lock libs/messages/package.json /usr/libs/messages/
RUN cd /usr/libs/messages && yarn install --network-timeout 1000000
COPY libs/map-editor/yarn.lock libs/map-editor/package.json /usr/libs/map-editor/
RUN cd /usr/libs/map-editor && yarn install --network-timeout 1000000
COPY map-storage/yarn.lock map-storage/package.json ./
RUN cd /usr/src && yarn install
COPY libs /usr/libs
COPY --from=proto-builder /usr/libs/messages/src ./../libs/messages/src
COPY map-storage .

ENV NODE_ENV=production
RUN yarn run build

# final production image
FROM node:18.9.1@sha256:48c6c0054de0a80275f9ff67010ab7b555848e126bc35893bba8a77bf871550a
WORKDIR /usr/src
COPY map-storage/yarn.lock map-storage/package.json ./
ENV NODE_ENV=production
RUN yarn install --production
COPY --from=builder /usr/src/dist /usr/src/dist
COPY --from=builder /usr/libs /usr/libs
COPY --chown=node:node --from=builder /usr/src/public /usr/src/public

USER node
CMD ["yarn", "run", "start"]
