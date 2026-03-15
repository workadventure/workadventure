#!/usr/bin/env bash
set -euo pipefail
if [ "$#" -lt 1 ]; then
  echo "usage: $0 <container_name>" >&2
  exit 1
fi
container="$1"
quoted_container=$(printf '%q' "$container")
exec ssh titan sh -lc "docker exec -it ${quoted_container} sh -lc 'command -v bash >/dev/null 2>&1 && exec bash || exec sh'"
