# we are rebuilding on each deploy to cope with the API_URL environment URL
FROM thecodingmachine/nodejs:14-apache

COPY --chown=docker:docker front .
COPY --chown=docker:docker messages /var/www/messages
RUN yarn install
RUN cd /var/www/messages && yarn install && yarn proto

ENV NODE_ENV=production
ENV STARTUP_COMMAND_1="yarn run build"
ENV APACHE_DOCUMENT_ROOT=dist/
