FROM thecodingmachine/workadventure-back-base:latest as builder
WORKDIR /var/www/messages
COPY --chown=docker:docker messages .
RUN yarn install && yarn proto

FROM thecodingmachine/nodejs:12

COPY --chown=docker:docker back .
COPY --from=builder --chown=docker:docker /var/www/messages /var/www/messages
RUN yarn install

ENV NODE_ENV=production

CMD ["yarn", "run", "prod"]

