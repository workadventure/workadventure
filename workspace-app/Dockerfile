FROM node:20-alpine AS build
WORKDIR /app

COPY workspace-app/package.json workspace-app/package-lock.json ./workspace-app/
WORKDIR /app/workspace-app
RUN npm ci

COPY workspace-app ./workspace-app
COPY workspace-config ../workspace-config
RUN npm run build

FROM nginx:1.27-alpine
COPY nginx.default.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/workspace-app/dist /usr/share/nginx/html

EXPOSE 8080
