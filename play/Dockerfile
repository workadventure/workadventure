# protobuf build
FROM --platform=$BUILDPLATFORM node:18.11-buster-slim@sha256:c3a4122a9b60c52a633b92788dec4159909158c828b56e11a3dc0284814a81f2 as proto-builder
WORKDIR /usr/src
COPY messages/package-lock.json messages/package.json ./
RUN yarn install
COPY messages .
COPY libs ./../libs
RUN yarn run tag-version && yarn proto && yarn ts-proto

# typescript build
FROM --platform=$BUILDPLATFORM node:18.11-buster-slim@sha256:c3a4122a9b60c52a633b92788dec4159909158c828b56e11a3dc0284814a81f2 as builder
WORKDIR /usr/src
RUN apt-get update && apt-get install -y git
COPY .yarn/releases .yarn/releases
COPY .yarn/plugins .yarn/plugins
COPY package.json yarn.lock .yarnrc.yml ./
COPY play/package.json play/package.json
COPY libs/messages/package.json libs/messages/package.json
COPY libs/map-editor/package.json libs/map-editor/package.json
COPY libs/math-utils/package.json libs/math-utils/package.json
COPY libs/tailwind/package.json libs/tailwind/package.json
RUN yarn workspaces focus workadventure-play
COPY libs ./libs
COPY --from=proto-builder /usr/libs/messages/src ./libs/messages/src
COPY play ./play
COPY --from=proto-builder /usr/src/generated play/src/messages/generated
ENV NODE_ENV=production
# upgrade RAM available to 6G
RUN cd play && yarn run typesafe-i18n && yarn run build-iframe-api && NODE_OPTIONS="--max-old-space-size=6144" yarn build

# final production image
FROM node:18.11-buster-slim@sha256:c3a4122a9b60c52a633b92788dec4159909158c828b56e11a3dc0284814a81f2
WORKDIR /usr/src
RUN apt-get update && apt-get install -y git
COPY .yarn/releases .yarn/releases
COPY .yarn/plugins .yarn/plugins
COPY package.json yarn.lock .yarnrc.yml ./
COPY play/package.json play/package.json
COPY libs/messages/package.json libs/messages/package.json
COPY libs/map-editor/package.json libs/map-editor/package.json
COPY libs/math-utils/package.json libs/math-utils/package.json
COPY libs/tailwind/package.json libs/tailwind/package.json
ENV NODE_ENV=production
RUN yarn workspaces focus workadventure-play --production
COPY --from=builder /usr/src/libs /usr/src/libs
COPY --from=builder --chown=node:node /usr/src/play /usr/src/play
#COPY play/src/pusher/data /usr/src/play/dist/pusher/data

WORKDIR /usr/src/play

USER node
CMD ["yarn", "run", "start"]
