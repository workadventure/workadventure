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

# final production image
FROM node:18.9.1@sha256:48c6c0054de0a80275f9ff67010ab7b555848e126bc35893bba8a77bf871550a
WORKDIR /usr/src
RUN apt-get update && apt-get install -y git
COPY .yarn/releases .yarn/releases
COPY .yarn/plugins .yarn/plugins
COPY package.json yarn.lock .yarnrc.yml ./
COPY map-storage/package.json map-storage/package.json
COPY libs/messages/package.json libs/messages/package.json
COPY libs/map-editor/package.json libs/map-editor/package.json
COPY libs/math-utils/package.json libs/math-utils/package.json
COPY libs/tailwind/package.json libs/tailwind/package.json
RUN yarn workspaces focus map-storage --production
COPY libs ./libs
COPY --from=proto-builder /usr/libs/messages/src ./libs/messages/src
COPY --chown=node:node map-storage map-storage

WORKDIR /usr/src/map-storage

USER node
CMD ["yarn", "run", "start"]
