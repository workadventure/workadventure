FROM node:14.18.2-buster-slim@sha256:20bedf0c09de887379e59a41c04284974f5fb529cf0e13aab613473ce298da3d as builder

WORKDIR /usr/src
COPY front .

RUN yarn install --network-timeout 1000000 && yarn run typesafe-i18n && yarn run build-iframe-api && yarn build

# final production image
FROM nginx:1.21.6-alpine

COPY front/nginx.conf /etc/nginx/conf.d/default.conf
COPY front/templater.sh /
COPY --from=builder /usr/src/dist /usr/share/nginx/html

EXPOSE 8080
CMD ["/bin/sh", "-c", "/templater.sh && envsubst < /usr/share/nginx/html/env-config.template.js > /usr/share/nginx/html/env-config.js && exec nginx -g 'daemon off;'"]
