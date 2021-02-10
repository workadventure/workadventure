FROM thecodingmachine/nodejs:12

COPY --chown=docker:docker uploader .
RUN yarn install

ENV NODE_ENV=production
RUN yarn run tsc

CMD ["yarn", "run", "runprod"]
