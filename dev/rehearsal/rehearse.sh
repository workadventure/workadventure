#!/usr/bin/env bash
# The whole rehearsal: cluster up on TypeScript, two users on a map, helm upgrade to Go, back to TypeScript, report.
#   ./rehearse.sh            REBUILD_GO=1 ./rehearse.sh (rebuilds wa-server-go:rehearsal from the lang-go worktree)
# Report: results/<date>.md (RUN=<id> changes the name; ONLY_TS=1 stops after the first phase, to debug the spec).
set -euo pipefail
source "$(dirname "${BASH_SOURCE[0]}")/common.sh"
cd "$HERE"
export RUN="${RUN:-$(date +%Y%m%d-%H%M)}"
export REPORT="$HERE/results/$RUN.md" LOCAL_PORT
REPO="$HERE/../.."
mkdir -p results

# One Playwright campaign at a time on the machine, the lock of `dev/dev test` (same directory, same format).
lock="$(git -C "$REPO" rev-parse --git-common-dir)/wa-playwright.lock"
case "$lock" in /*) ;; *) lock="$REPO/$lock" ;; esac
until mkdir "$lock" 2>/dev/null; do
  holder=$(cat "$lock/owner" 2>/dev/null || true)
  if [ -n "$holder" ] && ! kill -0 "${holder%% *}" 2>/dev/null; then
    echo "Stale Playwright slot ($holder): taking it over" >&2; rm -rf "$lock"; continue
  fi
  echo "$(date +%H:%M) Playwright slot held by: ${holder:-?}. Waiting..." >&2
  sleep 30
done
echo "$$ rehearsal since $(date +%H:%M)" > "$lock/owner"
trap 'rm -rf "$lock"' EXIT

./up.sh
./deploy.sh ts

# ---- report header: what is under test ----
img() { docker image inspect "$1" --format '{{.Id}}' 2>/dev/null | cut -c1-19; }
{
  echo "# Rehearsal $RUN"
  echo
  echo "Date: $(date '+%F %T %Z')  |  host: $(uname -sm)  |  minikube $(minikube version --short), Kubernetes $(k version -o json | python3 -c 'import json,sys; print(json.load(sys.stdin)["serverVersion"]["gitVersion"])'), helm $(helm version --short)"
  echo
  echo "## Versions"
  echo
  echo "| Component | Version |"
  echo "|---|---|"
  echo "| dev-socle (this rehearsal) | $(git -C "$REPO" rev-parse --short=9 HEAD)$( [ -n "$(git -C "$REPO" status --porcelain dev/rehearsal)" ] && echo ' + uncommitted changes in dev/rehearsal') |"
  echo "| TypeScript images (play, back, map-storage, uploader, maps) | \`$TS_TAG\` |"
  for i in play back map-storage uploader maps; do echo "| &nbsp;&nbsp;ghcr.io/workadventure/$i | $(img ghcr.io/workadventure/$i:$TS_TAG) |"; done
  echo "| Front (assets, template) | $FRONT_IMAGE, $(img "$FRONT_IMAGE") |"
  if [ -f .go-image-info ]; then
    # shellcheck disable=SC1091
    . ./.go-image-info
    echo "| Go server | \`$GO_IMAGE\` $(img "$GO_IMAGE"), built from lang-go \`${commit:0:9}\` ($dirty_files uncommitted file(s) at build time), API_VERSION \`$api_version\`, built $built_at |"
  else
    echo "| Go server | \`$GO_IMAGE\` $(img "$GO_IMAGE") (build info unknown: image built before .go-image-info; REBUILD_GO=1 records it) |"
  fi
  echo "| lang-go worktree now | $(git -C "$GO_SRC" rev-parse --short=9 HEAD), $(git -C "$GO_SRC" status --porcelain . | wc -l | tr -d ' ') uncommitted file(s) |"
  echo "| Helm chart | $(grep -E '^(name|version):' "$CHART/Chart.yaml" | tr '\n' ' ') |"
  echo "| Playwright / browser | $(node -p 'require("@playwright/test/package.json").version' 2>/dev/null || echo '?') / Chromium $(node -e 'const{chromium}=require("@playwright/test");chromium.launch().then(async b=>{console.log(b.version());await b.close()})' 2>/dev/null || echo '?') |"
  echo
  echo "Setup: one node, one play replica, Redis of the chart, ingress nginx, self-signed certificate, map-storage volume (PVC) mounted by the Go pod at /maps."
} > "$REPORT"

caffeinate -i npx playwright test -c "$HERE/playwright.config.ts" --workers=1 || status=$?
echo "Report: $REPORT"
exit "${status:-0}"
