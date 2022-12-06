# final production image
FROM node:18.12.1-buster-slim@sha256:62798b0191c85e2fc5f06897e345a6c9e8902ea3beedcb8e07463c665c37526d
WORKDIR /usr/src
RUN apt-get update && apt-get install -y git
COPY .yarn/releases .yarn/releases
COPY .yarn/plugins .yarn/plugins
COPY package.json yarn.lock .yarnrc.yml ./
COPY uploader/package.json uploader/package.json
ENV NODE_ENV=production
RUN yarn workspaces focus workadventureuploader --production
COPY uploader uploader

WORKDIR /usr/src/uploader
USER node
CMD ["yarn", "run", "start"]
