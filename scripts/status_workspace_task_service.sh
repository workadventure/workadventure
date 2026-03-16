#!/usr/bin/env bash
set -euo pipefail

PID_FILE=".runtime/workspace-task-service.pid"
LOG_FILE=".runtime/workspace-task-service.log"

if [ -f "$PID_FILE" ] && kill -0 "$(cat "$PID_FILE")" 2>/dev/null; then
  echo "workspace task service running pid=$(cat "$PID_FILE")"
  [ -f "$LOG_FILE" ] && tail -10 "$LOG_FILE"
else
  echo "workspace task service not running"
fi
