# The building of ProtoBuf "messages" must be done out of Docker because grpc-node does not ship with ARM64 binaries.
# See: https://github.com/grpc/grpc-node/issues/1405
# When the issue above is closed, we can move back messages building inside Dockerfile

# protobuf build
FROM --platform=$BUILDPLATFORM node:22.15-bullseye-slim AS proto-builder
WORKDIR /usr/src
COPY messages/package-lock.json messages/package.json ./
RUN npm ci
COPY messages .
COPY libs ./../libs
RUN npm run tag-version && npm run ts-proto

# typescript build
FROM --platform=$BUILDPLATFORM node:22.15-bullseye-slim AS builder
EXPOSE 3000 50053
WORKDIR /usr/src
ENV STORAGE_DIRECTORY=/maps
RUN mkdir /maps && chown node:node /maps
RUN apt-get update && apt-get install -y git curl
COPY package.json package-lock.json ./
COPY map-storage/package.json map-storage/package.json
COPY libs/messages/package.json libs/messages/package.json
COPY libs/map-editor/package.json libs/map-editor/package.json
COPY libs/math-utils/package.json libs/math-utils/package.json
COPY libs/tailwind/package.json libs/tailwind/package.json
COPY libs/store-utils/package.json libs/store-utils/package.json
COPY libs/shared-utils/package.json libs/shared-utils/package.json
RUN npm ci --workspace map-storage
COPY libs ./libs
COPY --from=proto-builder /usr/libs/messages/src ./libs/messages/src
COPY --chown=node:node map-storage map-storage
RUN cd map-storage && npm run front:build

# final production image
FROM node:22.15-bullseye-slim
EXPOSE 3000 50053
WORKDIR /usr/src
ENV STORAGE_DIRECTORY=/maps
RUN mkdir /maps && chown node:node /maps
RUN apt-get update && apt-get install -y git curl
COPY package.json package-lock.json ./
COPY map-storage/package.json map-storage/package.json
COPY libs/messages/package.json libs/messages/package.json
COPY libs/map-editor/package.json libs/map-editor/package.json
COPY libs/math-utils/package.json libs/math-utils/package.json
COPY libs/tailwind/package.json libs/tailwind/package.json
COPY libs/store-utils/package.json libs/store-utils/package.json
COPY libs/shared-utils/package.json libs/shared-utils/package.json
RUN npm ci --workspace map-storage
COPY libs ./libs
COPY --from=proto-builder /usr/libs/messages/src ./libs/messages/src
COPY --from=builder /usr/src/map-storage/dist-ui ./map-storage/dist-ui
COPY --chown=node:node map-storage map-storage
RUN chown node:node -R /usr/src/map-storage/dist-ui
WORKDIR /usr/src/map-storage
RUN mkdir ./dist

HEALTHCHECK --interval=5s --timeout=10s --start-period=5s --retries=10 CMD curl -f http://localhost:3000/ping || exit 1
USER node
CMD ["npm", "run", "start"]
