#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
CONTAINER_NAME="${E2E_FIX_UBUNTU_CONTAINER:-e2e-fix-ubuntu}"
IMAGE="${E2E_FIX_UBUNTU_IMAGE:-ubuntu:22.04}"

if docker ps --format '{{.Names}}' | grep -qx "$CONTAINER_NAME"; then
  echo "container $CONTAINER_NAME already running"
  exit 0
fi

docker rm -f "$CONTAINER_NAME" >/dev/null 2>&1 || true
docker run -d \
  --name "$CONTAINER_NAME" \
  -v "$ROOT_DIR:/workspace" \
  -w /workspace \
  "$IMAGE" \
  sleep infinity >/dev/null

echo "started $CONTAINER_NAME from $IMAGE"
echo "mounted host workspace: $ROOT_DIR -> /workspace"
