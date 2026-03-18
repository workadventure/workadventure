#!/usr/bin/env bash
set -euo pipefail
PID_FILE=".runtime/titan-ttyd.pid"
if [ ! -f "$PID_FILE" ]; then
  echo "ttyd not running"
  exit 0
fi
PID="$(cat "$PID_FILE")"
if kill -0 "$PID" 2>/dev/null; then
  kill "$PID"
  echo "stopped ttyd pid $PID"
else
  echo "stale pid file"
fi
rm -f "$PID_FILE"
