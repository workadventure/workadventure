#!/bin/sh

set -e

envsubst < /usr/share/nginx/html/env-config.template.js > /usr/share/nginx/html/env-config.js

/templater.sh

exec nginx -g 'daemon off;'
