#!/usr/bin/env bash
set -euo pipefail

PID_FILE=".runtime/workspace-file-service.pid"

if [ ! -f "$PID_FILE" ]; then
  echo "workspace file service not running"
  exit 0
fi

pid="$(cat "$PID_FILE")"
if kill -0 "$pid" 2>/dev/null; then
  kill "$pid"
  echo "stopped workspace file service pid $pid"
else
  echo "workspace file service pid $pid was stale"
fi

rm -f "$PID_FILE"
