#!/usr/bin/env bash
# ./deploy.sh ts|go|rust : same Helm release, so switching is a real `helm upgrade`.
set -euo pipefail
source "$(dirname "$0")/common.sh"
mode="${1:?usage: deploy.sh ts|go|rust}"
case "$mode" in ts|go|rust) ;; *) echo "usage: deploy.sh ts|go|rust" >&2; exit 2 ;; esac
[ "$mode" = ts ] || minikube image ls -p "$PROFILE" | grep -q "$(candidate_image "$mode")" \
  || { echo "$(candidate_image "$mode") is not in minikube: ./up.sh (or ./update.sh $mode) first" >&2; exit 1; }
cd "$HERE"

k create namespace "$NS" --dry-run=client -o yaml | k apply -f - >/dev/null
# The CA for the candidates' SSL_CERT_FILE, under the key the values mount (harmless in TS mode).
k -n "$NS" create secret generic rehearsal-tls --from-file=tls.crt=.certs/ca.crt \
  --dry-run=client -o yaml | k apply -f - >/dev/null

start=$SECONDS
date +"%H:%M:%S start $mode"
helm upgrade --install "$RELEASE" "$CHART" --kube-context "$CTX" -n "$NS" --wait --timeout 10m \
  -f "$CHART/values.yaml" -f values-common.yaml -f "values-$mode.yaml"
helm_done=$((SECONDS - start))
# Served through the ingress? (the browsers' point of view)
until [ "$(rcurl -o /dev/null -w '%{http_code}' --max-time 3 "https://play-$DOMAIN:443/ping" || true)" = 200 ]; do sleep 1; done
echo "== $mode: helm --wait ${helm_done}s, /ping through the ingress ${SECONDS}s after start"
k -n "$NS" get pods -o custom-columns=NAME:.metadata.name,IMAGE:.spec.containers[*].image,READY:.status.containerStatuses[*].ready
