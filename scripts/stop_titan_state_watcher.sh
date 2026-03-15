#!/usr/bin/env bash
set -euo pipefail
PID_FILE=".runtime/titan-state-watcher.pid"
if [ ! -f "$PID_FILE" ]; then
  echo "watcher not running"
  exit 0
fi
PID="$(cat "$PID_FILE")"
if kill -0 "$PID" 2>/dev/null; then
  kill "$PID"
  echo "stopped watcher pid $PID"
fi
rm -f "$PID_FILE"
