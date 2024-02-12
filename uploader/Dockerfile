# final production image
FROM node:20.8-bullseye-slim
EXPOSE 8080
WORKDIR /usr/src
RUN apt-get update && apt-get install -y git
COPY package.json package-lock.json ./
COPY uploader/package.json uploader/package.json
ENV NODE_ENV=production
RUN npm ci --omit=dev --workspace workadventureuploader
COPY uploader uploader

WORKDIR /usr/src/uploader
USER node
CMD ["npm", "run", "start"]
