#!/usr/bin/env bash
set -euo pipefail

CONTAINER_NAME="${E2E_FIX_UBUNTU_SSH_CONTAINER:-e2e-fix-ubuntu-ssh}"

docker rm -f "$CONTAINER_NAME" >/dev/null 2>&1 || true
echo "stopped $CONTAINER_NAME"
