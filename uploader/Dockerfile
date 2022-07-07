# typescript build
FROM node:16.15-buster-slim@sha256:9ad2f889d4a15ef94e40ac75e95c28daa34073dbc25d7b1e619caacc6b83623c as builder2
WORKDIR /usr/src
COPY uploader/yarn.lock uploader/package.json ./
RUN yarn install
COPY uploader .
ENV NODE_ENV=production
RUN yarn run tsc

# final production image
FROM node:16.15-buster-slim@sha256:9ad2f889d4a15ef94e40ac75e95c28daa34073dbc25d7b1e619caacc6b83623c
WORKDIR /usr/src
COPY uploader/yarn.lock uploader/package.json ./
ENV NODE_ENV=production
RUN yarn install --production
COPY --from=builder2 /usr/src/dist /usr/src/dist

USER node
CMD ["yarn", "run", "runprod"]
