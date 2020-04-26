FROM thecodingmachine/nodejs:12

COPY --chown=docker:docker . .
RUN yarn install

ENV NODE_ENV=production

CMD ["yarn", "run", "prod"]

