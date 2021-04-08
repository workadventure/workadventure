FROM thecodingmachine/workadventure-back-base:latest as builder
WORKDIR /var/www/messages
COPY --chown=docker:docker messages .
RUN yarn install && yarn proto

# we are rebuilding on each deploy to cope with the PUSHER_URL environment URL
FROM thecodingmachine/nodejs:14-apache

COPY --chown=docker:docker front .
COPY --from=builder --chown=docker:docker /var/www/messages/generated /var/www/html/src/Messages/generated

# Removing the iframe.html file from the final image as this adds a XSS attack.
# iframe.html is only in dev mode to circumvent a limitation
RUN rm dist/iframe.html

RUN yarn install

ENV NODE_ENV=production
ENV STARTUP_COMMAND_0="./templater.sh"
ENV STARTUP_COMMAND_1="yarn run build"
ENV APACHE_DOCUMENT_ROOT=dist/
