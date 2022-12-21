# protobuf build
FROM --platform=$BUILDPLATFORM node:16.15-buster-slim@sha256:9ad2f889d4a15ef94e40ac75e95c28daa34073dbc25d7b1e619caacc6b83623c as proto-builder
WORKDIR /usr/src
COPY messages/package-lock.json messages/package.json ./
RUN yarn install
COPY messages .
COPY libs ./../libs
RUN yarn run tag-version && yarn proto && yarn ts-proto

# final production image
FROM node:16.15-buster-slim@sha256:9ad2f889d4a15ef94e40ac75e95c28daa34073dbc25d7b1e619caacc6b83623c
WORKDIR /usr/src
RUN apt-get update && apt-get install -y git
COPY .yarn/releases .yarn/releases
COPY .yarn/plugins .yarn/plugins
COPY package.json yarn.lock .yarnrc.yml ./
COPY back/package.json back/package.json
COPY libs/messages/package.json libs/messages/package.json
COPY libs/map-editor/package.json libs/map-editor/package.json
COPY libs/math-utils/package.json libs/math-utils/package.json
COPY libs/tailwind/package.json libs/tailwind/package.json
COPY libs/store-utils/package.json libs/store-utils/package.json
ENV NODE_ENV=production
RUN yarn workspaces focus workadventureback --production
COPY libs ./libs
COPY --from=proto-builder /usr/libs/messages/src ./libs/messages/src
COPY back ./back
COPY --from=proto-builder /usr/src/generated ./back/src/Messages/generated

WORKDIR /usr/src/back

USER node
CMD ["yarn", "run", "runprod"]
