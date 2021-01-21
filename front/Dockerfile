# protobuf build
FROM node:14.15.4-buster-slim@sha256:cbae886186467bbfd274b82a234a1cdfbbd31201c2a6ee63a6893eefcf3c6e76 as builder
WORKDIR /usr/src
COPY messages .
RUN yarn install && yarn proto

# webpack build
FROM node:14.15.4-buster-slim@sha256:cbae886186467bbfd274b82a234a1cdfbbd31201c2a6ee63a6893eefcf3c6e76 as builder2
WORKDIR /usr/src
COPY front/yarn.lock front/package.json ./
RUN yarn install

COPY front .
COPY --from=builder /usr/src/generated src/Messages/generated
ENV NODE_ENV=production

ARG BASE_DOMAIN=workadventure.localhost
ARG API_URL=pusher.$BASE_DOMAIN
ARG UPLOADER_URL=uploader.$BASE_DOMAIN
ARG ADMIN_URL=admin.$BASE_DOMAIN

RUN API_URL=$API_URL UPLOADER_URL=$UPLOADER_URL ADMIN_URL=$ADMIN_URL \
    yarn run build

# final production image
FROM nginx:1.19.6-alpine@sha256:01747306a7247dbe928db991eab42e4002118bf636dd85b4ffea05dd907e5b66
COPY front/nginx-vhost.conf /etc/nginx/conf.d/default.conf
COPY --from=builder2 /usr/src/dist /usr/share/nginx/html
