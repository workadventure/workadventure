# protobuf build
FROM --platform=$BUILDPLATFORM node:22.16-bullseye-slim AS proto-builder
WORKDIR /usr/src
COPY messages/package-lock.json messages/package.json ./
RUN npm ci
COPY messages .
COPY libs ./../libs
RUN npm run tag-version && npm run ts-proto

# final production image
FROM node:22.16-bullseye-slim
EXPOSE 8080 50051
WORKDIR /usr/src
RUN apt-get update && apt-get install -y git curl
COPY package.json package-lock.json ./
COPY back/package.json back/package.json
COPY libs/messages/package.json libs/messages/package.json
COPY libs/map-editor/package.json libs/map-editor/package.json
COPY libs/math-utils/package.json libs/math-utils/package.json
COPY libs/tailwind/package.json libs/tailwind/package.json
COPY libs/store-utils/package.json libs/store-utils/package.json
COPY libs/shared-utils/package.json libs/shared-utils/package.json
ENV NODE_ENV=production
RUN npm ci --omit=dev --workspace workadventureback
COPY libs ./libs
COPY --from=proto-builder /usr/libs/messages/src ./libs/messages/src
COPY back ./back
COPY --from=proto-builder /usr/src/generated ./back/src/Messages/generated
WORKDIR /usr/src/back
HEALTHCHECK --interval=10s --timeout=7s --start-period=10s --retries=15 CMD curl -f http://localhost:8080/ping || exit 1
RUN mkdir ./dist
USER node
CMD ["npm", "run", "runprod"]

