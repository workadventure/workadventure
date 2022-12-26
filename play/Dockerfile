# protobuf build
FROM --platform=$BUILDPLATFORM node:18.12.1-buster-slim@sha256:62798b0191c85e2fc5f06897e345a6c9e8902ea3beedcb8e07463c665c37526d as proto-builder
WORKDIR /usr/src
COPY messages/package-lock.json messages/package.json ./
RUN npm install
COPY messages .
COPY libs ./../libs
RUN npm run tag-version && npm run proto && npm run ts-proto

# typescript build
FROM --platform=$BUILDPLATFORM node:18.12.1-buster-slim@sha256:62798b0191c85e2fc5f06897e345a6c9e8902ea3beedcb8e07463c665c37526d as builder
WORKDIR /usr/src
RUN corepack enable && corepack prepare pnpm@latest --activate
RUN apt-get update && apt-get install -y git
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY play/package.json play/package.json
COPY play/packages/iframe-api-typings/package.json play/packages/iframe-api-typings/package.json
COPY libs/messages/package.json libs/messages/package.json
COPY libs/map-editor/package.json libs/map-editor/package.json
COPY libs/math-utils/package.json libs/math-utils/package.json
COPY libs/tailwind/package.json libs/tailwind/package.json
COPY libs/store-utils/package.json libs/store-utils/package.json
RUN pnpm install --filter workadventure-play... --filter @workadventure/iframe-api-typings...
COPY libs ./libs
COPY --from=proto-builder /usr/libs/messages/src ./libs/messages/src
COPY play ./play
COPY --from=proto-builder /usr/src/generated play/src/messages/generated
ENV NODE_ENV=production
# upgrade RAM available to 6G
RUN cd play && pnpm run typesafe-i18n && pnpm run build-iframe-api && NODE_OPTIONS="--max-old-space-size=6144" pnpm run build

# final production image
FROM node:18.12.1-buster-slim@sha256:62798b0191c85e2fc5f06897e345a6c9e8902ea3beedcb8e07463c665c37526d
WORKDIR /usr/src
RUN corepack enable && corepack prepare pnpm@latest --activate
RUN apt-get update && apt-get install -y git
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY play/package.json play/package.json
COPY play/packages/iframe-api-typings/package.json play/packages/iframe-api-typings/package.json
COPY libs/messages/package.json libs/messages/package.json
COPY libs/map-editor/package.json libs/map-editor/package.json
COPY libs/math-utils/package.json libs/math-utils/package.json
COPY libs/tailwind/package.json libs/tailwind/package.json
COPY libs/store-utils/package.json libs/store-utils/package.json
ENV NODE_ENV=production
RUN pnpm install --prod --filter-prod workadventure-play...
COPY --from=builder /usr/src/libs /usr/src/libs
COPY --from=builder --chown=node:node /usr/src/play /usr/src/play
#COPY play/src/pusher/data /usr/src/play/dist/pusher/data

WORKDIR /usr/src/play

USER node
CMD ["pnpm", "run", "start"]
