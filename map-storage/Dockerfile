# The building of ProtoBuf "messages" must be done out of Docker because grpc-node does not ship with ARM64 binaries.
# See: https://github.com/grpc/grpc-node/issues/1405
# When the issue above is closed, we can move back messages building inside Dockerfile

# protobuf build
FROM --platform=$BUILDPLATFORM node:18.12.1-buster-slim@sha256:62798b0191c85e2fc5f06897e345a6c9e8902ea3beedcb8e07463c665c37526d as proto-builder
WORKDIR /usr/src
COPY messages/package-lock.json messages/package.json ./
RUN npm install
COPY messages .
COPY libs ./../libs
RUN npm run tag-version && npm run ts-proto

# final production image
FROM node:18.12.1-buster-slim@sha256:62798b0191c85e2fc5f06897e345a6c9e8902ea3beedcb8e07463c665c37526d
WORKDIR /usr/src
RUN corepack enable && corepack prepare pnpm@latest --activate
RUN apt-get update && apt-get install -y git
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY map-storage/package.json map-storage/package.json
COPY libs/messages/package.json libs/messages/package.json
COPY libs/map-editor/package.json libs/map-editor/package.json
COPY libs/math-utils/package.json libs/math-utils/package.json
COPY libs/tailwind/package.json libs/tailwind/package.json
COPY libs/store-utils/package.json libs/store-utils/package.json
RUN pnpm install --prod --filter-prod map-storage...
COPY libs ./libs
COPY --from=proto-builder /usr/libs/messages/src ./libs/messages/src
COPY --chown=node:node map-storage map-storage

WORKDIR /usr/src/map-storage

USER node
CMD ["pnpm", "run", "start"]
