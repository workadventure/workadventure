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
# A small CA that signs the server certificate: rustls (webpki) refuses a CA certificate used as the end entity, which
# a single `req -x509` certificate is (CA:TRUE). The candidates trust ca.crt (SSL_CERT_FILE); the ingress serves tls.crt.
if [ ! -f .certs/ca.crt ]; then
  rm -f .certs/tls.*
  openssl req -x509 -newkey rsa:2048 -nodes -days 90 -keyout .certs/ca.key -out .certs/ca.crt -subj "/CN=wa-rehearsal CA" 2>/dev/null
  openssl req -newkey rsa:2048 -nodes -keyout .certs/tls.key -out .certs/tls.csr -subj "/CN=*.localhost" 2>/dev/null
  printf 'basicConstraints=critical,CA:FALSE\nsubjectAltName=DNS:*.localhost,DNS:localhost\nextendedKeyUsage=serverAuth\n' > .certs/ext.cnf
  openssl x509 -req -in .certs/tls.csr -CA .certs/ca.crt -CAkey .certs/ca.key -CAcreateserial -days 90 \
    -extfile .certs/ext.cnf -out .certs/tls.crt 2>/dev/null
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
#    Candidates: built from their worktree (read-only) if the image is missing or REBUILD_GO=1 / REBUILD_RUST=1.
#    A candidate without a worktree (RUST_SRC absent) is skipped: build or `docker tag` the image yourself.
for img in play back map-storage uploader maps; do
  docker image inspect "ghcr.io/workadventure/$img:$TS_TAG" >/dev/null 2>&1 || docker pull "ghcr.io/workadventure/$img:$TS_TAG"
done
rebuilt=()
for mode in go rust; do
  var="REBUILD_$(echo "$mode" | tr a-z A-Z)"
  if ! docker image inspect "$(candidate_image "$mode")" >/dev/null 2>&1 || [ "${!var:-}" = 1 ]; then
    if [ -d "$(candidate_src "$mode")" ]; then build_candidate "$mode"; rebuilt+=("$(candidate_image "$mode")")
    else echo "skip $mode: $(candidate_src "$mode") not found (set $(echo "$mode" | tr a-z A-Z)_SRC or provide $(candidate_image "$mode"))"; fi
  fi
done
loaded=$(minikube image ls -p "$PROFILE" 2>/dev/null || true)
for img in "$FRONT_IMAGE" "$GO_IMAGE" "$RUST_IMAGE" matthiasluedtke/iconserver:v3.21.0 \
  $(for i in play back map-storage uploader maps; do echo "ghcr.io/workadventure/$i:$TS_TAG"; done); do
  docker image inspect "$img" >/dev/null 2>&1 || continue   # e.g. no Rust image
  # minikube lists docker.io/ prefixed names; a rebuilt image is always reloaded
  if [[ ! " ${rebuilt[*]-} " == *" $img "* ]]; then echo "$loaded" | grep -q "${img#docker.io/}" && continue; fi
  load_image "$img"
done

# 5. 127.0.0.1:8443 -> port 443 of the node (the ingress controller's hostPort), by a socat container on the
#    profile's docker network: `kubectl port-forward` dropped under load. Published on 127.0.0.1 ONLY (never 0.0.0.0:
#    that exposes the cluster to the local network). No sudo needed.
#    The hosts are https://*-rehearsal.localhost without a port: browsers must map them to 127.0.0.1:8443
#    (Chromium: --host-resolver-rules="MAP *.localhost 127.0.0.1:8443"), curl: --resolve / --connect-to (see common.sh).
node_ip=$(minikube ip -p "$PROFILE")
if [ "$(docker inspect -f '{{.State.Running}} {{index .Config.Labels "wa.rehearsal.target"}}' "$RELAY" 2>/dev/null)" != "true $node_ip:443" ]; then
  docker rm -f "$RELAY" >/dev/null 2>&1 || true
  docker run -d --name "$RELAY" --restart unless-stopped --network "$PROFILE" -p "127.0.0.1:$LOCAL_PORT:$LOCAL_PORT" \
    --label "wa.rehearsal.target=$node_ip:443" "$RELAY_IMAGE" \
    "TCP-LISTEN:$LOCAL_PORT,fork,reuseaddr" "TCP:$node_ip:443" >/dev/null
  sleep 1
fi
if nc -z 127.0.0.1 "$LOCAL_PORT"; then
  echo "127.0.0.1:$LOCAL_PORT relayed to $node_ip:443"
else
  echo "$LOCAL_PORT NOT relayed:"; docker logs "$RELAY" 2>&1 | tail -5; exit 1
fi
echo "Ready. Next: ./deploy.sh ts"
