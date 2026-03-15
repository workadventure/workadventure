#!/usr/bin/env bash
set -euo pipefail
for f in .runtime/*.pid; do
  [ -e "$f" ] || continue
  pid=$(cat "$f")
  base=$(basename "$f" .pid)
  if kill -0 "$pid" 2>/dev/null; then
    echo "$base running pid=$pid"
    [ -f ".runtime/$base.log" ] && tail -4 ".runtime/$base.log"
  else
    echo "$base stale pid=$pid"
  fi
  echo '---'
done
[ -f maps/observer/state/terminal-bridges.json ] && cat maps/observer/state/terminal-bridges.json
