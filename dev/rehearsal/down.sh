#!/usr/bin/env bash
# Deletes only the wa-rehearsal profile (and its relay).
set -euo pipefail
source "$(dirname "$0")/common.sh"
cd "$HERE"
docker rm -f "$RELAY" >/dev/null 2>&1 || true
minikube delete -p "$PROFILE"
