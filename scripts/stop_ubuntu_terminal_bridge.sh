#!/usr/bin/env bash
set -euo pipefail

PID_FILE=".runtime/ubuntu-ttyd.pid"

if [ ! -f "$PID_FILE" ]; then
  echo "ubuntu ttyd not running"
  exit 0
fi

pid="$(cat "$PID_FILE")"
if kill -0 "$pid" 2>/dev/null; then
  kill "$pid"
  echo "stopped ubuntu ttyd pid $pid"
else
  echo "ubuntu ttyd pid $pid was stale"
fi

rm -f "$PID_FILE"
