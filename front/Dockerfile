# we are rebuilding on each deploy to cope with the API_URL environment URL
FROM thecodingmachine/nodejs:12-apache

COPY --chown=docker:docker . .
RUN yarn install

ENV NODE_ENV=production
ENV STARTUP_COMMAND_1="yarn run build"
ENV APACHE_DOCUMENT_ROOT=dist/
