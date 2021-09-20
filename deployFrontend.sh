#!/usr/bin/env sh
# Builds and sends images from local to 🐙ArgoCD

docker build -f front/Dockerfile . -t iits/workadventure-front:develop && \
docker push iits/workadventure-front:develop
