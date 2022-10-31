#!/bin/sh

set -e

envsubst < /usr/share/nginx/html/env-config.template.js > /usr/share/nginx/html/env-config.js
envsubst < /usr/share/nginx/html/server.template.json > /usr/share/nginx/html/server.json

/templater.sh

exec nginx -g 'daemon off;'
