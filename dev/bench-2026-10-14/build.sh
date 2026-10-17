#!/usr/bin/env bash
# Builds bin/loadbot (lang-go's load generator + loadbot-map-ws.patch) and bin/wa-server-go for Linux, from the
# lang-go commit measured on 2026-10-14. The repo's worktrees share their objects, so no checkout is needed.
#   build.sh [lang-go ref, default cf803d7d1]
set -euo pipefail
HERE=$(cd "$(dirname "$0")" && pwd)
SRC=$(mktemp -d); trap 'rm -rf "$SRC"' EXIT
git -C "$(git -C "$HERE" rev-parse --show-toplevel)" archive "${1:-cf803d7d1}" server-go | tar -x -C "$SRC"
patch -s -d "$SRC" -p1 < "$HERE/loadbot-map-ws.patch"
ARCH=$(docker info --format '{{.Architecture}}'); case "$ARCH" in aarch64) ARCH=arm64 ;; x86_64) ARCH=amd64 ;; esac
mkdir -p "$HERE/bin" && cd "$SRC/server-go"
GOOS=linux GOARCH=$ARCH CGO_ENABLED=0 go build -o "$HERE/bin/loadbot" ./cmd/loadbot
GOOS=linux GOARCH=$ARCH CGO_ENABLED=0 go build -o "$HERE/bin/wa-server-go" ./cmd/server
