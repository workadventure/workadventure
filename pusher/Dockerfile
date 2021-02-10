FROM thecodingmachine/workadventure-back-base:latest as builder
WORKDIR /var/www/messages
COPY --chown=docker:docker messages .
RUN yarn install && yarn proto

FROM thecodingmachine/nodejs:12

COPY --chown=docker:docker pusher .
COPY --from=builder --chown=docker:docker /var/www/messages/generated /usr/src/app/src/Messages/generated
RUN yarn install

ENV NODE_ENV=production
RUN yarn run tsc

CMD ["yarn", "run", "runprod"]
