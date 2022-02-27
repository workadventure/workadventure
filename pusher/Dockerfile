# typescript build
FROM node:14.18.2-buster-slim@sha256:20bedf0c09de887379e59a41c04284974f5fb529cf0e13aab613473ce298da3d as builder1
WORKDIR /usr/src
COPY yarn.lock ./ 
COPY package.json ./
RUN yarn install
COPY . .
ENV NODE_ENV=production
RUN yarn run tsc

# final production image
FROM node:14.18.2-buster-slim@sha256:20bedf0c09de887379e59a41c04284974f5fb529cf0e13aab613473ce298da3d
WORKDIR /usr/src
COPY yarn.lock ./
COPY package.json ./
ENV NODE_ENV=production
RUN yarn install --production
COPY --from=builder1 /usr/src/dist /usr/src/dist


# port
EXPOSE 8080

USER node
CMD ["yarn", "run", "runprod"]

# docker  build script 
# docker build --tag wa-pusher:latest .

