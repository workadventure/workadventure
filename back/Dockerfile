# protobuf build
FROM uselagoon/node-14 as builder
WORKDIR /usr/src
COPY messages .
RUN yarn install && yarn proto

# typescript build
FROM uselagoon/node-14 as builder2
WORKDIR /usr/src
COPY back/yarn.lock back/package.json ./
RUN yarn install
COPY back .
COPY --from=builder /usr/src/generated src/Messages/generated
ENV NODE_ENV=production
RUN yarn run tsc

# final production image
FROM uselagoon/node-14
WORKDIR /usr/src
COPY back/yarn.lock back/package.json ./
COPY .lagoon.env ./
COPY --from=builder2 /usr/src/dist /usr/src/dist
ENV NODE_ENV=production
RUN yarn install --production

USER node
CMD ["yarn", "run", "runprod"]
