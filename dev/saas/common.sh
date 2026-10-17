# Sourced by up.sh / down.sh. Only ever touches the compose project "wa-saas-go".
HERE=$(cd "$(dirname "$0")" && pwd)
SAAS_REPO=${SAAS_REPO:-/Users/yannisdiarra/Documents/Git/workadventure-saas}
GO_SRC=${GO_SRC:-$HERE/../../../lang-go/server-go}   # read-only: docker build context only
PROJECT=wa-saas-go
[ -f "$HERE/.env" ] || cp "$HERE/.env.example" "$HERE/.env"
dc() {
  docker compose -p "$PROJECT" --project-directory "$SAAS_REPO" --env-file "$HERE/.env" \
    -f "$SAAS_REPO/docker-compose.yaml" -f "$HERE/docker-compose.saas-go.yaml" "$@"
}
