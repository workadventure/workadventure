#!/usr/bin/env bash
# Creates (or completes) the wa-rehearsal minikube cluster. Idempotent. Never touches another profile.
set -euo pipefail
source "$(dirname "$0")/common.sh"
cd "$HERE"

# 1. Cluster. --keep-context: the global kubectl context (maybe a real cluster) is left alone.
if ! minikube status -p "$PROFILE" >/dev/null 2>&1; then
  minikube start -p "$PROFILE" --driver=docker --cpus=4 --memory=4096 --keep-context
fi
k wait --for=condition=Ready node --all --timeout=120s

# 2. Ingress nginx, with our self-signed certificate as default certificate. Hosts are play-rehearsal.localhost...
#    (a dash, not a dot): only a *.localhost wildcard covers them.
minikube addons list -p "$PROFILE" | grep -E "^\| ingress +\|" | grep -q enabled || minikube addons enable ingress -p "$PROFILE" >/dev/null
mkdir -p .certs
if [ ! -f .certs/tls.crt ]; then
  openssl req -x509 -newkey rsa:2048 -nodes -days 90 -keyout .certs/tls.key -out .certs/tls.crt \
    -subj "/CN=*.localhost" -addext "subjectAltName=DNS:*.localhost,DNS:localhost" 2>/dev/null
fi
k -n ingress-nginx create secret tls rehearsal-tls --cert=.certs/tls.crt --key=.certs/tls.key \
  --dry-run=client -o yaml | k apply -f - >/dev/null
if ! k -n ingress-nginx get deploy ingress-nginx-controller -o jsonpath='{.spec.template.spec.containers[0].args}' | grep -qF default-ssl-certificate; then
  k -n ingress-nginx patch deploy ingress-nginx-controller --type=json \
    -p '[{"op":"add","path":"/spec/template/spec/containers/0/args/-","value":"--default-ssl-certificate=ingress-nginx/rehearsal-tls"}]'
fi
k -n ingress-nginx rollout status deploy/ingress-nginx-controller --timeout=180s
# The admission webhook jobs must be over, or the first helm install races them.
k -n ingress-nginx wait --for=condition=Complete job --all --timeout=120s >/dev/null || true

# 3. CoreDNS: *.rehearsal.localhost -> the ingress controller, from inside the pods.
if ! k -n kube-system get cm coredns -o jsonpath='{.data.Corefile}' | grep -qF "(.*)${DOMAIN%%.*}"; then
  k -n kube-system get cm coredns -o json | python3 -c '
import json, sys
cm = json.load(sys.stdin)
domain = sys.argv[1].replace(".", "\\.")
rule = "    rewrite name regex (.*)%s ingress-nginx-controller.ingress-nginx.svc.cluster.local answer auto\n" % domain
lines = [l for l in cm["data"]["Corefile"].splitlines(True) if "rewrite name regex" not in l]
cm["data"]["Corefile"] = "".join(lines).replace("    ready\n", "    ready\n" + rule, 1)
json.dump(cm, sys.stdout)' "$DOMAIN" | k apply -f - >/dev/null
  k -n kube-system rollout restart deploy/coredns
  k -n kube-system rollout status deploy/coredns --timeout=120s
fi

# 4. Images. TS: copied from the local docker daemon (pull them first if missing). Front: built locally by the socle.
#    Go: built from the lang-go worktree (read-only), API_VERSION = hash of the front's API (must match the front image).
for img in play back map-storage uploader maps; do
  docker image inspect "ghcr.io/workadventure/$img:$TS_TAG" >/dev/null 2>&1 || docker pull "ghcr.io/workadventure/$img:$TS_TAG"
done
if ! docker image inspect "$GO_IMAGE" >/dev/null 2>&1 || [ "${REBUILD_GO:-}" = 1 ]; then
  docker build --target prod --build-arg "API_VERSION=$(sh "$GO_SRC/api-version.sh")" --build-arg VERSION=1.0.0 -t "$GO_IMAGE" "$GO_SRC"
fi
loaded=$(minikube image ls -p "$PROFILE" 2>/dev/null || true)
for img in "$FRONT_IMAGE" "$GO_IMAGE" matthiasluedtke/iconserver:v3.21.0 \
  $(for i in play back map-storage uploader maps; do echo "ghcr.io/workadventure/$i:$TS_TAG"; done); do
  # minikube lists docker.io/ prefixed names
  if [ "${REBUILD_GO:-}" != 1 ] || [ "$img" != "$GO_IMAGE" ]; then
    echo "$loaded" | grep -q "${img#docker.io/}" && continue
  fi
  echo "load $img"
  # Some multi-arch ghcr images cannot be exported from the local daemon ("not found in tar"): pull them in the node.
  minikube image load "$img" -p "$PROFILE" 2>/dev/null || { echo "  load failed, pulling in the node"; minikube ssh -p "$PROFILE" -- docker pull -q "$img" >/dev/null; }
done

# 5. Port-forward 443 (no sudo) in the background. macOS refuses a privileged port on 127.0.0.1 and ::1 but accepts the
#    wildcard address: the cluster is therefore reachable from the LAN on 443 while it runs (throwaway data only).
if ! lsof -nP -iTCP:443 -sTCP:LISTEN >/dev/null 2>&1; then
  nohup kubectl --context "$CTX" -n ingress-nginx port-forward --address 0.0.0.0 svc/ingress-nginx-controller 443:443 \
    >.port-forward.log 2>&1 &
  echo $! > .port-forward.pid
  sleep 2
fi
if lsof -nP -iTCP:443 -sTCP:LISTEN >/dev/null 2>&1; then echo "443 forwarded"; else echo "443 NOT forwarded:"; cat .port-forward.log; exit 1; fi
echo "Ready. Next: ./deploy.sh ts"
