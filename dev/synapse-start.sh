#!/bin/bash
# synapse/start.sh, adapted to the socle: the public URLs carry the socle's port, the data lives in the /data volume
# instead of the repo, and the SSO whitelist accepts the play host of every stack (it is a prefix match).
set -e
P="$SOCLE_URL_PORT"

cp -n /repo-synapse/matrix.workadventure.localhost.signing.key /repo-synapse/matrix.workadventure.localhost.log.config /data/
sed -e "s|\${JWT_SECRET}|$JWT_SECRET|" \
    -e "s|http://oidc.workadventure.localhost|http://oidc.workadventure.localhost$P|" \
    -e "s|http://matrix.workadventure.localhost/|http://matrix.workadventure.localhost$P/|" \
    -e "s|- http://play.workadventure.localhost/|- http://play.|" \
    /repo-synapse/homeserver.template.yaml > /data/homeserver.yaml

echo "Waiting for the OIDC mock server..."
until python -c "import urllib.request; urllib.request.urlopen('http://oidc.workadventure.localhost$P/.well-known/openid-configuration')" 2>/dev/null; do
    sleep 1
done

python -m synapse.app.homeserver --config-path /data/homeserver.yaml --generate-config --report-stats=no
chmod -R 777 /data

(sleep 10 && register_new_matrix_user -c /data/homeserver.yaml -u "$MATRIX_ADMIN_USER" -p "$MATRIX_ADMIN_PASSWORD" -a || true) &
exec /start.py
