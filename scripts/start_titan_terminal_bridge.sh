#!/usr/bin/env bash
set -euo pipefail

PORT="${TITAN_TTYD_PORT:-7683}"
PID_FILE=".runtime/titan-ttyd.pid"
LOG_FILE=".runtime/titan-ttyd.log"

if [ -f "$PID_FILE" ] && kill -0 "$(cat "$PID_FILE")" 2>/dev/null; then
  echo "ttyd already running on pid $(cat "$PID_FILE")"
  exit 0
fi

rm -f "$PID_FILE"
nohup ttyd -p "$PORT" -t titleFixed='Titan Terminal' ssh titan > "$LOG_FILE" 2>&1 &
echo $! > "$PID_FILE"
sleep 1

echo "started ttyd pid $(cat "$PID_FILE") on http://127.0.0.1:${PORT}"
