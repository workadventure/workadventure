# typescript build
FROM node:16.15-buster-slim@sha256:9ad2f889d4a15ef94e40ac75e95c28daa34073dbc25d7b1e619caacc6b83623c as builder2
WORKDIR /usr/src
RUN apt-get update && apt-get install -y git
RUN yarn set version stable
RUN yarn plugin import workspace-tools
COPY package.json yarn.lock .yarnrc.yml ./
COPY uploader/package.json uploader/package.json
RUN yarn workspaces focus workadventureuploader
COPY uploader uploader
ENV NODE_ENV=production
RUN cd uploader && yarn run tsc

# final production image
FROM node:16.15-buster-slim@sha256:9ad2f889d4a15ef94e40ac75e95c28daa34073dbc25d7b1e619caacc6b83623c
WORKDIR /usr/src
RUN apt-get update && apt-get install -y git
RUN yarn set version stable
RUN yarn plugin import workspace-tools
COPY package.json yarn.lock .yarnrc.yml ./
COPY uploader/package.json uploader/package.json
ENV NODE_ENV=production
RUN yarn workspaces focus workadventureuploader --production
COPY --from=builder2 /usr/src/uploader/dist /usr/src/uploader/dist

WORKDIR /usr/src/uploader
USER node
CMD ["yarn", "run", "runprod"]
