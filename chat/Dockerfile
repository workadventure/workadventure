# The building of ProtoBuf "messages" must be done out of Docker because grpc-node does not ship with ARM64 binaries.
# See: https://github.com/grpc/grpc-node/issues/1405
# When the issue above is closed, we can move back messages building inside Dockerfile

# protobuf build
FROM --platform=$BUILDPLATFORM node:20.8.0-bullseye-slim@sha256:9027d0d778368a3091ee36b0bfdc98ebf3d7815ee4e2811b05cc40ec2a0adf4e as proto-builder
WORKDIR /usr/src
COPY messages/package-lock.json messages/package.json ./
RUN npm ci
COPY messages .
COPY libs ./../libs
RUN npm run tag-version && npm run ts-proto

# typescript build
FROM --platform=$BUILDPLATFORM node:20.8.0-bullseye-slim@sha256:9027d0d778368a3091ee36b0bfdc98ebf3d7815ee4e2811b05cc40ec2a0adf4e as builder
WORKDIR /usr/src
RUN apt-get update && apt-get install -y git
COPY package.json package-lock.json ./
COPY chat/package.json chat/package.json
COPY libs/messages/package.json libs/messages/package.json
COPY libs/map-editor/package.json libs/map-editor/package.json
COPY libs/math-utils/package.json libs/math-utils/package.json
COPY libs/tailwind/package.json libs/tailwind/package.json
COPY libs/store-utils/package.json libs/store-utils/package.json
COPY libs/shared-utils/package.json libs/shared-utils/package.json
RUN npm ci --workspace=workadventurechat
COPY libs ./libs
COPY --from=proto-builder /usr/libs/messages/src ./libs/messages/src
COPY chat ./chat

# upgrade RAM available to 6G
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
    cd chat && \
    npm run typesafe-i18n && \
    SENTRY_RELEASE=$SENTRY_RELEASE SENTRY_URL=$SENTRY_URL SENTRY_AUTH_TOKEN=$SENTRY_AUTH_TOKEN SENTRY_ORG=$SENTRY_ORG SENTRY_PROJECT=$SENTRY_PROJECT SENTRY_ENVIRONMENT=$SENTRY_ENVIRONMENT NODE_OPTIONS="--max-old-space-size=6144" npm run build

RUN mv /usr/src/chat/dist/index.html /usr/src/chat/dist/index.tpl.html
# Bypassing a bug in envconfig generation that does not take into account relative base.
RUN sed -i 's|src="/env-config|src="./env-config|g' /usr/src/chat/dist/index.tpl.html

# final production image
FROM nginx:1.21.6-alpine

RUN rm /usr/share/nginx/html/index.html
COPY chat/nginx.conf /etc/nginx/conf.d/default.conf
COPY chat/templater.sh /
COPY chat/start_nginx.sh /start_nginx.sh

COPY --from=builder /usr/src/chat/dist /usr/share/nginx/html

HEALTHCHECK --interval=5s --timeout=10s --start-period=5s --retries=10 CMD curl -f http://localhost || exit 1

EXPOSE 80
CMD ["/start_nginx.sh"]
