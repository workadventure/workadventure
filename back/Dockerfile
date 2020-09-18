FROM thecodingmachine/nodejs:12

COPY --chown=docker:docker back .
COPY --chown=docker:docker messages ../messages
RUN yarn install
RUN cd /usr/src/messages && yarn install && yarn proto

ENV NODE_ENV=production

CMD ["yarn", "run", "prod"]

