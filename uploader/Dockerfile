# final production image
FROM node:18.12.1-buster-slim@sha256:62798b0191c85e2fc5f06897e345a6c9e8902ea3beedcb8e07463c665c37526d
WORKDIR /usr/src
RUN corepack enable && corepack prepare pnpm@latest --activate
RUN apt-get update && apt-get install -y git
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY uploader/package.json uploader/package.json
ENV NODE_ENV=production
RUN pnpm install --prod --filter-prod workadventureuploader...
COPY uploader uploader

WORKDIR /usr/src/uploader
USER node
CMD ["pnpm", "run", "start"]
