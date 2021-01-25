# protobuf build
FROM uselagoon/node-14 as builder
WORKDIR /usr/src
COPY messages .
RUN yarn install && yarn proto

# typescript build
FROM uselagoon/node-14 as builder2
WORKDIR /usr/src
COPY pusher/yarn.lock pusher/package.json ./
RUN yarn install
COPY pusher .
COPY --from=builder /usr/src/generated src/Messages/generated
ENV NODE_ENV=production
RUN yarn run tsc

# final production image
FROM uselagoon/node-14
WORKDIR /usr/src
COPY pusher/yarn.lock pusher/package.json ./
COPY .lagoon.env ./
COPY --from=builder2 /usr/src/dist /usr/src/dist
ENV NODE_ENV=production
RUN yarn install --production

USER node
CMD ["yarn", "run", "runprod"]
