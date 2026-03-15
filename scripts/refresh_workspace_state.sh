#!/usr/bin/env bash
set -euo pipefail

# Purpose:
# Pull a fresh read-only status snapshot from titan and rebuild the WorkAdventure map.
# Usage:
#   ./scripts/refresh_workspace_state.sh
# Preconditions:
# - ~/.ssh/config contains a working `Host titan`
# - Mac public key is authorized on titan

python3 scripts/fetch_titan_state.py
python3 maps/observer/generate_workspace_v1.py

echo
echo 'Refresh complete.'
echo 'Open or reload:'
echo '  http://play.workadventure.localhost/_/global/maps.workadventure.localhost/observer/workspace-v1.json'
