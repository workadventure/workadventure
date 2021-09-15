FROM node:14.15.4-buster-slim@sha256:cbae886186467bbfd274b82a234a1cdfbbd31201c2a6ee63a6893eefcf3c6e76 as builder
WORKDIR /usr/src
COPY messages .
RUN yarn install && yarn proto

# we are rebuilding on each deploy to cope with the PUSHER_URL environment URL
FROM thecodingmachine/nodejs:14-apache

COPY --chown=docker:docker front .
COPY --from=builder --chown=docker:docker /usr/src/generated /var/www/html/src/Messages/generated

# Removing the iframe.html file from the final image as this adds a XSS attack.
# iframe.html is only in dev mode to circumvent a limitation
RUN rm dist/iframe.html

RUN yarn install

ENV NODE_ENV=production
ENV STARTUP_COMMAND_0="./templater.sh"
ENV STARTUP_COMMAND_1="yarn run build"
ENV APACHE_DOCUMENT_ROOT=dist/
