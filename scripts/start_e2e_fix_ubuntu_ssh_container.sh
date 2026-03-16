#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
CONTAINER_NAME="${E2E_FIX_UBUNTU_SSH_CONTAINER:-e2e-fix-ubuntu-ssh}"
IMAGE_NAME="${E2E_FIX_UBUNTU_SSH_IMAGE:-e2e-fix-ubuntu-ssh:latest}"
SSH_PORT="${E2E_FIX_UBUNTU_SSH_PORT:-2222}"
AUTHORIZED_KEYS_FILE="${E2E_FIX_UBUNTU_AUTHORIZED_KEYS:-$HOME/.ssh/authorized_keys}"
LOCAL_PUBKEY_FILE="${E2E_FIX_UBUNTU_LOCAL_PUBKEY:-$HOME/.ssh/id_ed25519.pub}"

if [ ! -f "$AUTHORIZED_KEYS_FILE" ]; then
  echo "authorized_keys file not found: $AUTHORIZED_KEYS_FILE" >&2
  exit 1
fi

docker build -f "$ROOT_DIR/docker/ubuntu-ssh/Dockerfile" -t "$IMAGE_NAME" "$ROOT_DIR" >/dev/null
docker rm -f "$CONTAINER_NAME" >/dev/null 2>&1 || true

docker run -d \
  --name "$CONTAINER_NAME" \
  --hostname "$CONTAINER_NAME" \
  -p "127.0.0.1:${SSH_PORT}:22" \
  -v "$ROOT_DIR:/workspace" \
  -v "$AUTHORIZED_KEYS_FILE:/authorized_keys/authorized_keys:ro" \
  -v "$LOCAL_PUBKEY_FILE:/authorized_keys/id_ed25519.pub:ro" \
  -w /workspace \
  "$IMAGE_NAME" >/dev/null

echo "started $CONTAINER_NAME"
echo "ssh endpoint: ssh -p ${SSH_PORT} ubuntu@127.0.0.1"
echo "mounted host workspace: $ROOT_DIR -> /workspace"
