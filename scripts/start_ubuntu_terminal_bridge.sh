#!/usr/bin/env bash
set -euo pipefail

PORT="${UBUNTU_TTYD_PORT:-7682}"
PID_FILE=".runtime/ubuntu-ttyd.pid"
LOG_FILE=".runtime/ubuntu-ttyd.log"
SSH_KEY="${E2E_FIX_UBUNTU_SSH_KEY:-$HOME/.ssh/id_ed25519}"

if [ -f "$PID_FILE" ] && kill -0 "$(cat "$PID_FILE")" 2>/dev/null; then
  echo "ubuntu ttyd already running on pid $(cat "$PID_FILE")"
  exit 0
fi

rm -f "$PID_FILE"
nohup ttyd -p "$PORT" -t titleFixed='Ubuntu Workspace Terminal' \
  ssh -i "$SSH_KEY" -o StrictHostKeyChecking=accept-new -p 2222 ubuntu@127.0.0.1 > "$LOG_FILE" 2>&1 &
echo $! > "$PID_FILE"
sleep 1

echo "started ubuntu ttyd pid $(cat "$PID_FILE") on http://127.0.0.1:${PORT}"
