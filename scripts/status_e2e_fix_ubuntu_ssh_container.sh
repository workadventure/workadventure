#!/usr/bin/env bash
set -euo pipefail

CONTAINER_NAME="${E2E_FIX_UBUNTU_SSH_CONTAINER:-e2e-fix-ubuntu-ssh}"

docker ps --filter "name=^/${CONTAINER_NAME}$" --format 'table {{.ID}}\t{{.Names}}\t{{.Image}}\t{{.Status}}\t{{.Ports}}\t{{.Mounts}}'
