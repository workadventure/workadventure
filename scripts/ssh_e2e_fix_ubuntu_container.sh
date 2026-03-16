#!/usr/bin/env bash
set -euo pipefail

SSH_PORT="${E2E_FIX_UBUNTU_SSH_PORT:-2222}"
SSH_KEY="${E2E_FIX_UBUNTU_SSH_KEY:-$HOME/.ssh/id_ed25519}"

exec ssh \
  -i "$SSH_KEY" \
  -o StrictHostKeyChecking=accept-new \
  -o UserKnownHostsFile="${HOME}/.ssh/known_hosts" \
  -p "$SSH_PORT" \
  ubuntu@127.0.0.1
