# Shared by up.sh, down.sh, deploy.sh (sourced).
PROFILE=wa-rehearsal
CTX=wa-rehearsal          # minikube names the kube context after the profile; always passed explicitly
NS=wa
RELEASE=rehearsal
DOMAIN=rehearsal.localhost
TS_TAG=master-034dee80bbe3b29327de03b650b38e452ecf1293
FRONT_IMAGE=wa-socle-front:$TS_TAG
GO_IMAGE=wa-server-go:rehearsal
RUST_IMAGE=wa-server-rust:rehearsal
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CHART="$HERE/../../contrib/helm"
GO_SRC="${GO_SRC:-$HERE/../../../lang-go/server-go}"   # read-only: only used as docker build context
RUST_SRC="${RUST_SRC:-$HERE/../../../lang-rust/server-rust}"   # idem; same image contract as Go (see README)
LOCAL_PORT=8443          # relay to the ingress, 127.0.0.1 only (up.sh)
RELAY=wa-rehearsal-relay
RELAY_IMAGE=alpine/socat:1.8.0.3
# curl to a rehearsal host through the local relay: rcurl https://play-$DOMAIN/ping
rcurl() { curl -sk --connect-to "::127.0.0.1:$LOCAL_PORT" "$@"; }
k() { kubectl --context "$CTX" "$@"; }
# Candidate server (go|rust): image name, source dir.
candidate_image() { case "$1" in go) echo "$GO_IMAGE" ;; rust) echo "$RUST_IMAGE" ;; esac; }
candidate_src() { case "$1" in go) echo "$GO_SRC" ;; rust) echo "$RUST_SRC" ;; esac; }
# build_candidate go|rust: docker build --target prod, API_VERSION from the candidate's api-version.sh (must equal the
# front's API hash). Records what went into the image in .<mode>-image-info (read by rehearse.sh).
build_candidate() {
  local img src; img=$(candidate_image "$1"); src=$(candidate_src "$1")
  [ -f "$src/Dockerfile" ] && [ -f "$src/api-version.sh" ] || { echo "$1: no Dockerfile + api-version.sh in $src" >&2; return 1; }
  local contexts=()
  # The Rust image reads the protos and the pusher's static data from named contexts (server-rust/Dockerfile).
  [ "$1" = rust ] && contexts=(--build-context "protos=$src/../messages/protos" --build-context "pusherdata=$src/../play/src/pusher/data")
  docker buildx build --load ${contexts[@]+"${contexts[@]}"} --target prod --build-arg "API_VERSION=$(sh "$src/api-version.sh")" --build-arg VERSION=1.0.0 -t "$img" "$src"
  # The worktree may carry uncommitted work.
  { echo "commit=$(git -C "$src" rev-parse HEAD)"; echo "dirty_files=$(git -C "$src" status --porcelain . | wc -l | tr -d ' ')"
    echo "api_version=$(sh "$src/api-version.sh")"; echo "built_at=$(date -u +%FT%TZ)"; } > "$HERE/.$1-image-info"
}
# minikube image load, falling back to a pull in the node (some multi-arch ghcr images: "not found in tar").
# minikube image load keeps the node's image when the tag already exists there (a rebuilt :rehearsal stayed stale):
# untag it in the node first, then check the node now has the local build (Created: the IDs differ between the host's containerd store and the node).
node_image_built() { minikube ssh -p "$PROFILE" -- docker image inspect -f '{{.Created}}' "$1" 2>/dev/null | tr -d '\r' || true; }
load_image() {
  echo "load $1"
  local want; want=$(docker image inspect -f '{{.Created}}' "$1" 2>/dev/null || true)
  if [ -n "$want" ] && [ "$(node_image_built "$1")" = "$want" ]; then echo "  already in the node"; return; fi
  [ -z "$want" ] || minikube ssh -p "$PROFILE" -- docker rmi -f "$1" >/dev/null 2>&1 || true
  minikube image load "$1" -p "$PROFILE" 2>/dev/null || { echo "  load failed, pulling in the node"; minikube ssh -p "$PROFILE" -- docker pull -q "$1" >/dev/null; }
  if [ -n "$want" ] && [ "$(node_image_built "$1")" != "$want" ]; then echo "  $1 in the node is not the local image" >&2; return 1; fi
}
