#!/usr/bin/env bash
# Data written to / read back from whichever servers are deployed (through the local relay of up.sh).
#   ./data.sh write <tag>         a new map rehearsal-<run>-<tag>.wam, an edit of the shared map, a file for the uploader
#   ./data.sh check <tag>         reads back what write <tag> stored: "CHECK <what> <tag> OK|MISSING|DIFFERENT (detail)"
#   ./data.sh check-shared <tag>  the shared map must hold the content written last by <tag>
#   ./data.sh redis <room-url>    the Redis keys of the room (the variable hash), to compare the stored format
# RUN (env, default: the date) keeps one run's names apart from another's. State: results/.state/<run>-<tag>.env
set -uo pipefail
source "$(dirname "${BASH_SOURCE[0]}")/common.sh"
RUN="${RUN:-$(date +%Y%m%d)}"
STATE="$HERE/results/.state"; mkdir -p "$STATE"
MS=https://map-storage-$DOMAIN:443
UP=https://uploader-$DOMAIN:443
AUTH=john.doe:password
variant() { case "$1" in ts) echo empty.json ;; go) echo empty_2_frames.json ;; *) echo livezone.json ;; esac; }
# Content of a map: the mapUrl tells which writer wrote it.
wam() { printf '{"version":"1.0.0","mapUrl":"https://maps-%s/tests/E2E/%s","areas":[],"entities":{},"entityCollections":[]}' "$DOMAIN" "$(variant "$1")"; }
put() { # put <name> <content> : HTTP status
  local f; f=$(mktemp); printf '%s' "$2" > "$f"
  rcurl -o /dev/null -w '%{http_code}' -u "$AUTH" -X PUT -F "file=@$f;filename=$1;type=application/json" "$MS/$1"; rm -f "$f"
}
verdict() { # verdict <what> <tag> <expected> <actual> <http>
  if [ "$5" != 200 ]; then echo "CHECK $1 $2 MISSING (HTTP $5)"
  elif [ "$3" = "$4" ]; then echo "CHECK $1 $2 OK"
  else echo "CHECK $1 $2 DIFFERENT (got: ${4:0:80})"; fi
}
get() { # get <url> [curl args] : body, then the status on the last line
  rcurl -u "$AUTH" -w '\n%{http_code}' "$@"
}

case "${1:-}" in
write)
  tag=${2:?tag}
  name="rehearsal-$RUN-$tag.wam"
  echo "WRITE map $tag $name HTTP $(put "$name" "$(wam "$tag")")"
  echo "WRITE shared-map $tag rehearsal-$RUN-shared.wam HTTP $(put "rehearsal-$RUN-shared.wam" "$(wam "$tag")")"
  payload="file written by $tag at $(date +%T) $RANDOM$RANDOM"
  f=$(mktemp); printf '%s' "$payload" > "$f"
  resp=$(rcurl -F "file=@$f;filename=rehearsal-$tag.txt;type=text/plain" "$UP/upload-file"); rm -f "$f"
  id=$(printf '%s' "$resp" | python3 -c 'import json,sys; print(json.load(sys.stdin)[0]["id"])' 2>/dev/null || true)
  printf 'FILE_ID=%s\nPAYLOAD=%q\n' "$id" "$payload" > "$STATE/$RUN-$tag.env"
  echo "WRITE file $tag id=${id:-FAILED: ${resp:0:100}}"
  ;;
check)
  tag=${2:?tag}
  name="rehearsal-$RUN-$tag.wam"
  out=$(get "$MS/$name"); verdict map "$tag" "$(wam "$tag")" "$(echo "$out" | sed '$d')" "$(echo "$out" | tail -1)"
  # shellcheck disable=SC1090
  source "$STATE/$RUN-$tag.env"
  if [ -z "${FILE_ID:-}" ]; then echo "CHECK file $tag MISSING (no id: the write failed)"; exit 0; fi
  out=$(rcurl -w '\n%{http_code}' "$UP/upload-file/$FILE_ID")
  verdict file "$tag" "$PAYLOAD" "$(echo "$out" | sed '$d')" "$(echo "$out" | tail -1)"
  ;;
check-shared)
  tag=${2:?tag}
  out=$(get "$MS/rehearsal-$RUN-shared.wam"); verdict shared-map "$tag" "$(wam "$tag")" "$(echo "$out" | sed '$d')" "$(echo "$out" | tail -1)"
  ;;
redis)
  room=${2:?room url}
  # The variables of a room: a hash at the room URL (TS RedisVariablesRepository). Go claims the same format.
  k -n "$NS" exec rehearsal-redis-master-0 -- sh -c 'for key in $(redis-cli --scan --pattern "*'"$room"'*"); do echo "KEY $key ($(redis-cli type "$key"))"; redis-cli hgetall "$key"; done; echo "DBSIZE $(redis-cli dbsize)"' 2>&1
  ;;
*) echo "usage: data.sh write|check|check-shared <tag> | redis <room>" >&2; exit 2 ;;
esac
