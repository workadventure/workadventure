#!/usr/bin/env bash
set -euo pipefail

PORT="${WORKSPACE_FILE_PORT:-4175}"
PID_FILE=".runtime/workspace-file-service.pid"
LOG_FILE=".runtime/workspace-file-service.log"

mkdir -p .runtime

if [ -f "$PID_FILE" ] && kill -0 "$(cat "$PID_FILE")" 2>/dev/null; then
  echo "workspace file service already running on pid $(cat "$PID_FILE")"
  exit 0
fi

rm -f "$PID_FILE"
nohup node scripts/workspace_file_service.mjs > "$LOG_FILE" 2>&1 &
echo $! > "$PID_FILE"
sleep 1

echo "started workspace file service pid $(cat "$PID_FILE") on http://127.0.0.1:${PORT}"
