#!/usr/bin/env bash
set -euo pipefail

PID_FILE=".runtime/workspace-task-service.pid"

if [ ! -f "$PID_FILE" ]; then
  echo "workspace task service not running"
  exit 0
fi

pid="$(cat "$PID_FILE")"
if kill -0 "$pid" 2>/dev/null; then
  kill "$pid"
  echo "stopped workspace task service pid $pid"
else
  echo "workspace task service pid $pid was stale"
fi

rm -f "$PID_FILE"
