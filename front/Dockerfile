# protobuf build
FROM node:14.15.4-buster-slim@sha256:cbae886186467bbfd274b82a234a1cdfbbd31201c2a6ee63a6893eefcf3c6e76 as builder
WORKDIR /usr/src
COPY messages .
RUN yarn install && yarn proto

# webpack build
FROM uselagoon/node-14-builder as builder2
WORKDIR /usr/src
COPY front/yarn.lock front/package.json ./
RUN yarn install

COPY front .
COPY --from=builder /usr/src/generated src/Messages/generated
ENV NODE_ENV=production

ARG LAGOON_PROJECT
ARG LAGOON_ENVIRONMENT
ARG LAGOON_CLUSTER
ARG BASE_DOMAIN=$LAGOON_ENVIRONMENT.$LAGOON_PROJECT.$LAGOON_CLUSTER
ARG API_URL=pusher.$BASE_DOMAIN
ARG UPLOADER_URL=uploader.$BASE_DOMAIN
ARG ADMIN_URL=admin.$BASE_DOMAIN
ARG INSERT_ANALYTICS=NO
ARG GA_TRACKING_ID=""
ARG START_ROOM_URL=/_/global/digitalegesellschaft.github.io/workadventure-map-winterkongress/winterlandschaft.json
ARG TURN_SERVER="turn:coturn.workadventu.re:443,turns:coturn.workadventu.re:443"
ARG TURN_USER=workadventure
ARG TURN_PASSWORD=WorkAdventure123

RUN API_URL=$API_URL UPLOADER_URL=$UPLOADER_URL ADMIN_URL=$ADMIN_URL INSERT_ANALYTICS=$INSERT_ANALYTICS GA_TRACKING_ID=$GA_TRACKING_ID START_ROOM_URL=$START_ROOM_URL TURN_SERVER=$TURN_SERVER TURN_USER=$TURN_USER TURN_PASSWORD=$TURN_PASSWORD \
    ./templater.sh && yarn run build

# final production image
FROM uselagoon/nginx
COPY front/nginx-vhost-lagoon.conf /etc/nginx/conf.d/app.conf
COPY --from=builder2 /usr/src/dist /usr/share/nginx/html
