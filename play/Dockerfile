# protobuf build
FROM --platform=$BUILDPLATFORM node:18.12.1-buster-slim@sha256:62798b0191c85e2fc5f06897e345a6c9e8902ea3beedcb8e07463c665c37526d as proto-builder
WORKDIR /usr/src
COPY messages/package-lock.json messages/package.json ./
RUN yarn install
COPY messages .
COPY libs ./../libs
RUN yarn run tag-version && yarn proto && yarn ts-proto

# typescript build
FROM --platform=$BUILDPLATFORM node:18.12.1-buster-slim@sha256:62798b0191c85e2fc5f06897e345a6c9e8902ea3beedcb8e07463c665c37526d as builder
WORKDIR /usr/src
RUN apt-get update && apt-get install -y git
COPY .yarn/releases .yarn/releases
COPY .yarn/plugins .yarn/plugins
COPY package.json yarn.lock .yarnrc.yml ./
COPY play/package.json play/package.json
COPY play/packages/iframe-api-typings/package.json play/packages/iframe-api-typings/package.json
COPY libs/messages/package.json libs/messages/package.json
COPY libs/map-editor/package.json libs/map-editor/package.json
COPY libs/math-utils/package.json libs/math-utils/package.json
COPY libs/tailwind/package.json libs/tailwind/package.json
COPY libs/store-utils/package.json libs/store-utils/package.json
RUN yarn workspaces focus workadventure-play @workadventure/iframe-api-typings
COPY libs ./libs
COPY --from=proto-builder /usr/libs/messages/src ./libs/messages/src
COPY play ./play
COPY --from=proto-builder /usr/src/generated play/src/messages/generated
ENV NODE_ENV=production
# upgrade RAM available to 6G
RUN cd play && yarn run typesafe-i18n && yarn run build-iframe-api && NODE_OPTIONS="--max-old-space-size=6144" yarn build

# final production image
FROM node:18.12.1-buster-slim@sha256:62798b0191c85e2fc5f06897e345a6c9e8902ea3beedcb8e07463c665c37526d
WORKDIR /usr/src
RUN apt-get update && apt-get install -y git
COPY .yarn/releases .yarn/releases
COPY .yarn/plugins .yarn/plugins
COPY package.json yarn.lock .yarnrc.yml ./
COPY play/package.json play/package.json
COPY play/packages/iframe-api-typings/package.json play/packages/iframe-api-typings/package.json
COPY libs/messages/package.json libs/messages/package.json
COPY libs/map-editor/package.json libs/map-editor/package.json
COPY libs/math-utils/package.json libs/math-utils/package.json
COPY libs/tailwind/package.json libs/tailwind/package.json
COPY libs/store-utils/package.json libs/store-utils/package.json
ENV NODE_ENV=production
RUN yarn workspaces focus workadventure-play --production
COPY --from=builder /usr/src/libs /usr/src/libs
COPY --from=builder --chown=node:node /usr/src/play /usr/src/play
#COPY play/src/pusher/data /usr/src/play/dist/pusher/data

WORKDIR /usr/src/play

USER node
CMD ["yarn", "run", "start"]
