# Static egress room-composite UI (Vite build → nginx).
# Build from repo root (monorepo lockfile):
#   docker build -f libs/livekit-recording-template/Dockerfile -t workadventure-livekit-recording-template .
FROM node:22-alpine AS builder
WORKDIR /src
COPY package.json package-lock.json ./
COPY libs/livekit-recording-template ./libs/livekit-recording-template/
RUN npm ci --workspace=@workadventure/livekit-recording-template
RUN npm run build --workspace=@workadventure/livekit-recording-template

FROM nginx:1.27-alpine
COPY --from=builder /src/libs/livekit-recording-template/dist /usr/share/nginx/html
