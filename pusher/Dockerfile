# protobuf build
FROM node:14.18.2-buster-slim@sha256:20bedf0c09de887379e59a41c04284974f5fb529cf0e13aab613473ce298da3d as builder
WORKDIR /usr/src
COPY messages .
RUN yarn install && yarn proto

# typescript build
FROM node:14.18.2-buster-slim@sha256:20bedf0c09de887379e59a41c04284974f5fb529cf0e13aab613473ce298da3d as builder2
WORKDIR /usr/src
COPY pusher/yarn.lock pusher/package.json ./
RUN yarn install
COPY pusher .
COPY --from=builder /usr/src/generated src/Messages/generated
COPY --from=builder /usr/src/JsonMessages src/Messages/JsonMessages
ENV NODE_ENV=production
RUN yarn run tsc

# final production image
FROM node:14.18.2-buster-slim@sha256:20bedf0c09de887379e59a41c04284974f5fb529cf0e13aab613473ce298da3d
WORKDIR /usr/src
COPY pusher/yarn.lock pusher/package.json ./
COPY --from=builder2 /usr/src/dist /usr/src/dist
ENV NODE_ENV=production
RUN yarn install --production

USER node
CMD ["yarn", "run", "runprod"]
