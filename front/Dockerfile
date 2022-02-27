# typescript build
FROM node:14.18.2-buster-slim@sha256:20bedf0c09de887379e59a41c04284974f5fb529cf0e13aab613473ce298da3d as builder
WORKDIR /usr/src/front
COPY yarn.lock ./
COPY package.json ./
RUN yarn install
COPY . .

RUN sed -i 's/import { Observable } from "rxjs";/import type { Observable } from "rxjs";/g' src/Messages/ts-proto-generated/messages.ts
RUN yarn run typesafe-i18n && yarn run build-iframe-api && yarn build

# final production image
FROM nginx:1.21.6-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
#COPY templater.sh /
COPY --from=builder --chown=docker:docker /usr/src/front/dist /usr/share/nginx/html

EXPOSE 80
CMD ["/bin/sh", "-c", "envsubst < /usr/share/nginx/html/env-config.template.js > /usr/share/nginx/html/env-config.js && exec nginx -g 'daemon off;'"]


# docker  build script 
# docker build --tag wa-front:latest .