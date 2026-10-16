# Shared by up.sh, down.sh, deploy.sh (sourced).
PROFILE=wa-rehearsal
CTX=wa-rehearsal          # minikube names the kube context after the profile; always passed explicitly
NS=wa
RELEASE=rehearsal
DOMAIN=rehearsal.localhost
TS_TAG=master-6f4d02319eddbf46a51cb99ffd38e2d75273593c
FRONT_IMAGE=wa-socle-front:$TS_TAG
GO_IMAGE=wa-server-go:rehearsal
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CHART="$HERE/../../contrib/helm"
GO_SRC="${GO_SRC:-$HERE/../../../lang-go/server-go}"   # read-only: only used as docker build context
k() { kubectl --context "$CTX" "$@"; }
