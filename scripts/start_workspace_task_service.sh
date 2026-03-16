#!/usr/bin/env bash
set -euo pipefail

PORT="${WORKSPACE_TASK_PORT:-4180}"
HOST="${WORKSPACE_TASK_HOST:-0.0.0.0}"
PID_FILE=".runtime/workspace-task-service.pid"
LOG_FILE=".runtime/workspace-task-service.log"

mkdir -p .runtime

if [ -f "$PID_FILE" ] && kill -0 "$(cat "$PID_FILE")" 2>/dev/null; then
  echo "workspace task service already running on pid $(cat "$PID_FILE")"
  exit 0
fi

rm -f "$PID_FILE"
nohup python3 scripts/workspace_task_service.py > "$LOG_FILE" 2>&1 &
echo $! > "$PID_FILE"
sleep 1

echo "started workspace task service pid $(cat "$PID_FILE") on http://${HOST}:${PORT}"
