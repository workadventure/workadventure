#!/usr/bin/env bash
# ./update.sh go|rust : after a code change. Rebuilds the candidate's image from its worktree, loads it into minikube,
# deploys that mode and restarts play (the tag `rehearsal` does not change, so helm alone would keep the old pod).
set -euo pipefail
source "$(dirname "$0")/common.sh"
mode="${1:?usage: update.sh go|rust}"
case "$mode" in go|rust) ;; *) echo "usage: update.sh go|rust" >&2; exit 2 ;; esac
cd "$HERE"
build_candidate "$mode"
load_image "$(candidate_image "$mode")"
./deploy.sh "$mode"
k -n "$NS" rollout restart "deploy/$RELEASE-workadventure-play"
k -n "$NS" rollout status "deploy/$RELEASE-workadventure-play" --timeout=5m
until [ "$(rcurl -o /dev/null -w '%{http_code}' --max-time 3 "https://play-$DOMAIN:443/ping" || true)" = 200 ]; do sleep 1; done
echo "== $mode updated: $(tr "\n" " " < ".$mode-image-info")"
