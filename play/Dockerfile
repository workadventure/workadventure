
# protobuf build
FROM --platform=$BUILDPLATFORM node:20.18-bullseye-slim AS proto-builder
WORKDIR /usr/src
COPY messages/package-lock.json messages/package.json ./
RUN npm ci
COPY messages .
COPY libs ./../libs
RUN npm run tag-version && npm run ts-proto

# typescript build
FROM --platform=$BUILDPLATFORM node:20.18-bullseye-slim AS builder
ARG NODE_OPTIONS="--max-old-space-size=16384"
WORKDIR /usr/src
RUN apt-get update && apt-get install -y git
COPY package.json package-lock.json ./
COPY play/package.json play/package.json
COPY play/packages/iframe-api-typings/package.json play/packages/iframe-api-typings/package.json
COPY libs/messages/package.json libs/messages/package.json
COPY libs/map-editor/package.json libs/map-editor/package.json
COPY libs/math-utils/package.json libs/math-utils/package.json
COPY libs/tailwind/package.json libs/tailwind/package.json
COPY libs/store-utils/package.json libs/store-utils/package.json
COPY libs/shared-utils/package.json libs/shared-utils/package.json
RUN npm ci --workspace=workadventure-play --workspace=@workadventure/iframe-api-typings...
COPY libs ./libs
COPY --from=proto-builder /usr/libs/messages/src ./libs/messages/src
COPY play ./play
COPY --from=proto-builder /usr/src/generated play/src/messages/generated
ENV NODE_ENV=production
RUN --mount=type=secret,id=SENTRY_RELEASE \
    --mount=type=secret,id=SENTRY_URL \
    --mount=type=secret,id=SENTRY_AUTH_TOKEN \
    --mount=type=secret,id=SENTRY_ORG \
    --mount=type=secret,id=SENTRY_PROJECT \
    --mount=type=secret,id=SENTRY_ENVIRONMENT \
    export SENTRY_RELEASE=$(cat /run/secrets/SENTRY_RELEASE) && \
    export SENTRY_URL=$(cat /run/secrets/SENTRY_URL) && \
    export SENTRY_AUTH_TOKEN=$(cat /run/secrets/SENTRY_AUTH_TOKEN) && \
    export SENTRY_ORG=$(cat /run/secrets/SENTRY_ORG) && \
    export SENTRY_PROJECT=$(cat /run/secrets/SENTRY_PROJECT) && \
    export SENTRY_ENVIRONMENT=$(cat /run/secrets/SENTRY_ENVIRONMENT) && \
    export NODE_OPTIONS="$NODE_OPTIONS" && \
    cd play && \
    npm run typesafe-i18n && \
    npm run build-iframe-api && \
    SENTRY_RELEASE=$SENTRY_RELEASE SENTRY_URL=$SENTRY_URL SENTRY_AUTH_TOKEN=$SENTRY_AUTH_TOKEN SENTRY_ORG=$SENTRY_ORG SENTRY_PROJECT=$SENTRY_PROJECT SENTRY_ENVIRONMENT=$SENTRY_ENVIRONMENT npm run build

# final production image
FROM node:20.18-bullseye-slim
EXPOSE 3000
WORKDIR /usr/src
RUN apt-get update && apt-get install -y git curl
COPY package.json package-lock.json ./
COPY play/package.json play/package.json
COPY play/packages/iframe-api-typings/package.json play/packages/iframe-api-typings/package.json
COPY libs/messages/package.json libs/messages/package.json
COPY libs/map-editor/package.json libs/map-editor/package.json
COPY libs/math-utils/package.json libs/math-utils/package.json
COPY libs/tailwind/package.json libs/tailwind/package.json
COPY libs/store-utils/package.json libs/store-utils/package.json
COPY libs/shared-utils/package.json libs/shared-utils/package.json
ENV NODE_ENV=production
ENV UWS_HTTP_MAX_HEADERS_SIZE=16384
RUN npm ci --omit=dev --workspace workadventure-play
COPY --from=builder /usr/src/libs /usr/src/libs
COPY --from=builder --chown=node:node /usr/src/play /usr/src/play
WORKDIR /usr/src/play

HEALTHCHECK --interval=10s --timeout=7s --start-period=10s --retries=15 CMD curl -f http://localhost:3000/ping || exit 1

USER node
CMD ["npm", "run", "start"]
