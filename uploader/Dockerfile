# typescript build
FROM node:14.15.4-buster-slim@sha256:cbae886186467bbfd274b82a234a1cdfbbd31201c2a6ee63a6893eefcf3c6e76 as builder2
WORKDIR /usr/src
COPY uploader/yarn.lock uploader/package.json ./
RUN yarn install
COPY uploader .
ENV NODE_ENV=production
RUN yarn run tsc

# final production image
FROM node:14.15.4-buster-slim@sha256:cbae886186467bbfd274b82a234a1cdfbbd31201c2a6ee63a6893eefcf3c6e76
WORKDIR /usr/src
COPY uploader/yarn.lock uploader/package.json ./
COPY --from=builder2 /usr/src/dist /usr/src/dist
ENV NODE_ENV=production
RUN yarn install --production

USER node
CMD ["yarn", "run", "runprod"]
