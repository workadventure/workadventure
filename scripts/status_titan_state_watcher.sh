#!/usr/bin/env bash
set -euo pipefail
PID_FILE=".runtime/titan-state-watcher.pid"
LOG_FILE=".runtime/titan-state-watcher.log"
if [ -f "$PID_FILE" ] && kill -0 "$(cat "$PID_FILE")" 2>/dev/null; then
  echo "running pid $(cat "$PID_FILE")"
else
  echo "not running"
fi
[ -f "$LOG_FILE" ] && { echo '--- log tail ---'; tail -20 "$LOG_FILE"; }
