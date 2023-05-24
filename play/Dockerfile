# protobuf build
FROM --platform=$BUILDPLATFORM node:18.12.1-buster-slim@sha256:62798b0191c85e2fc5f06897e345a6c9e8902ea3beedcb8e07463c665c37526d as proto-builder
WORKDIR /usr/src
COPY messages/package-lock.json messages/package.json ./
RUN npm ci
COPY messages .
COPY libs ./../libs
RUN npm run tag-version && npm run ts-proto

# typescript build
FROM --platform=$BUILDPLATFORM node:18.12.1-buster-slim@sha256:62798b0191c85e2fc5f06897e345a6c9e8902ea3beedcb8e07463c665c37526d as builder
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
# upgrade RAM available to 6G
RUN --mount=type=secret,id=SENTRY_RELEASE \
    --mount=type=secret,id=SENTRY_AUTH_TOKEN \
    --mount=type=secret,id=SENTRY_ORG \
    --mount=type=secret,id=SENTRY_PROJECT \
    export SENTRY_RELEASE=$(cat /run/secrets/SENTRY_RELEASE) && \
    export SENTRY_AUTH_TOKEN=$(cat /run/secrets/SENTRY_AUTH_TOKEN) && \
    export SENTRY_ORG=$(cat /run/secrets/SENTRY_ORG) && \
    export SENTRY_PROJECT=$(cat /run/secrets/SENTRY_PROJECT) && \
    cd play && \
    npm run typesafe-i18n && \
    npm run build-iframe-api && \
    SENTRY_RELEASE=$SENTRY_RELEASE SENTRY_AUTH_TOKEN=$SENTRY_AUTH_TOKEN SENTRY_ORG=$SENTRY_ORG SENTRY_PROJECT=$SENTRY_PROJECT NODE_OPTIONS="--max-old-space-size=6144" npm run build

# final production image
FROM node:18.12.1-buster-slim@sha256:62798b0191c85e2fc5f06897e345a6c9e8902ea3beedcb8e07463c665c37526d
EXPOSE 3000
WORKDIR /usr/src
USER node
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
ENV NODE_ENV=production
RUN npm ci --omit=dev --workspace workadventure-play
COPY --from=builder /usr/src/libs /usr/src/libs
COPY --from=builder --chown=node:node /usr/src/play /usr/src/play
WORKDIR /usr/src/play

RUN apt-get update && apt-get install -y curl
HEALTHCHECK --interval=5s --timeout=10s --start-period=5s --retries=10 CMD curl -f http://localhost:3000 || exit 1


CMD ["npm", "run", "start"]
