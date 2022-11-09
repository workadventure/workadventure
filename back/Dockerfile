# protobuf build
FROM --platform=$BUILDPLATFORM node:16.15-buster-slim@sha256:9ad2f889d4a15ef94e40ac75e95c28daa34073dbc25d7b1e619caacc6b83623c as proto-builder
WORKDIR /usr/src
COPY messages/yarn.lock messages/package.json ./
RUN yarn install
COPY messages .
COPY libs ./../libs
RUN yarn run tag-version && yarn proto && yarn ts-proto

# typescript build
FROM --platform=$BUILDPLATFORM node:16.15-buster-slim@sha256:9ad2f889d4a15ef94e40ac75e95c28daa34073dbc25d7b1e619caacc6b83623c as builder
WORKDIR /usr/src
COPY libs/messages/yarn.lock libs/messages/package.json ./../libs/messages/
RUN cd ../libs/messages && yarn install --network-timeout 1000000
COPY --from=proto-builder /usr/libs/messages/src ./../libs/messages/src
COPY back/yarn.lock back/package.json ./
RUN yarn install
COPY libs ./../libs
COPY --from=proto-builder /usr/libs/messages/src ./../libs/messages/src
COPY back .
COPY --from=proto-builder /usr/src/generated src/Messages/generated
ENV NODE_ENV=production
RUN yarn run tsc

# final production image
FROM node:16.15-buster-slim@sha256:9ad2f889d4a15ef94e40ac75e95c28daa34073dbc25d7b1e619caacc6b83623c
WORKDIR /usr/src
COPY back/yarn.lock back/package.json ./
ENV NODE_ENV=production
RUN yarn install --production
COPY --from=builder /usr/src/dist /usr/src/dist

USER node
CMD ["yarn", "run", "runprod"]
