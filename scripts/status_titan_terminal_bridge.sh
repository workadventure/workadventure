#!/usr/bin/env bash
set -euo pipefail
PORT="${TITAN_TTYD_PORT:-7682}"
PID_FILE=".runtime/titan-ttyd.pid"
LOG_FILE=".runtime/titan-ttyd.log"
if [ -f "$PID_FILE" ] && kill -0 "$(cat "$PID_FILE")" 2>/dev/null; then
  echo "running pid $(cat "$PID_FILE") url=http://127.0.0.1:${PORT}"
else
  echo "not running"
fi
[ -f "$LOG_FILE" ] && { echo '--- log tail ---'; tail -40 "$LOG_FILE"; }
