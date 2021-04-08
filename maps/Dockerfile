FROM thecodingmachine/nodejs:12-apache

COPY --chown=docker:docker . .
#RUN yarn install

#ENV NODE_ENV=production
#ENV STARTUP_COMMAND_1="yarn run build"
#ENV APACHE_DOCUMENT_ROOT=dist/
RUN sudo a2enmod headers
