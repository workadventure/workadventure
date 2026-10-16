#!/usr/bin/env bash
# Deletes only the wa-rehearsal profile (and its port-forward).
set -euo pipefail
source "$(dirname "$0")/common.sh"
cd "$HERE"
[ -f .port-forward.pid ] && kill "$(cat .port-forward.pid)" 2>/dev/null || true
rm -f .port-forward.pid .port-forward.log
minikube delete -p "$PROFILE"
