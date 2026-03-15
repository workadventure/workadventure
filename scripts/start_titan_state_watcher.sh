#!/usr/bin/env bash
set -euo pipefail
PID_FILE=".runtime/titan-state-watcher.pid"
LOG_FILE=".runtime/titan-state-watcher.log"
if [ -f "$PID_FILE" ] && kill -0 "$(cat "$PID_FILE")" 2>/dev/null; then
  kill "$(cat "$PID_FILE")" || true
  rm -f "$PID_FILE"
  sleep 1
fi
./scripts/start_workspace_terminal_bridges.sh >/dev/null 2>&1 || true
nohup python3 scripts/watch_titan_state.py > "$LOG_FILE" 2>&1 &
echo $! > "$PID_FILE"
sleep 1
echo "started watcher pid $(cat "$PID_FILE")"
