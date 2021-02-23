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
ARG INSERT_ANALYTICS=NO
ARG GA_TRACKING_ID=""
ARG START_ROOM_URL=/_/global/digitalegesellschaft.github.io/workadventure-map-winterkongress/winterlandschaft.json
ARG STUN_SERVER="stun:coturn.binarylogic.ch"
ARG JITSI_URL=open.meet.switch.ch

RUN API_URL=$API_URL INSERT_ANALYTICS=$INSERT_ANALYTICS GA_TRACKING_ID=$GA_TRACKING_ID START_ROOM_URL=$START_ROOM_URL STUN_SERVER=$STUN_SERVER JITSI_URL=$JITSI_URL\
    ./templater.sh && yarn run build

# final production image
FROM uselagoon/nginx
COPY front/nginx-vhost-lagoon.conf /etc/nginx/conf.d/app.conf
COPY --from=builder2 /usr/src/dist /usr/share/nginx/html
