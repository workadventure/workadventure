FROM node:20-alpine AS build
WORKDIR /app/workspace-app

COPY workspace-app/package.json workspace-app/package-lock.json ./
RUN npm ci

COPY workspace-app/ ./
COPY workspace-config /app/workspace-config
RUN npm run build

FROM nginx:1.27-alpine
COPY workspace-app/nginx.default.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/workspace-app/dist /usr/share/nginx/html

EXPOSE 8080
