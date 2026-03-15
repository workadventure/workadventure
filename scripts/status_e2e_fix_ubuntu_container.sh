#!/usr/bin/env bash
set -euo pipefail

CONTAINER_NAME="${E2E_FIX_UBUNTU_CONTAINER:-e2e-fix-ubuntu}"

docker ps --filter "name=^/${CONTAINER_NAME}$" --format 'table {{.ID}}\t{{.Names}}\t{{.Image}}\t{{.Status}}\t{{.Mounts}}'
