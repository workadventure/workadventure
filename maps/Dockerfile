FROM thecodingmachine/php:8.1-v4-apache-node12

COPY --chown=docker:docker . .
#RUN yarn install

#ENV NODE_ENV=production
#ENV STARTUP_COMMAND_1="yarn run build"
#ENV APACHE_DOCUMENT_ROOT=dist/
#RUN sudo a2enmod headers
ENV APACHE_EXTENSION_HEADERS=1
