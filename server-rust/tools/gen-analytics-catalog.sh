#!/usr/bin/env sh
# Regenerates crates/server/analytics-catalog.json from libs/messages (the output is committed: the server embeds it).
set -eu
here="$(cd "$(dirname "$0")" && pwd)"
repo="$(cd "$here/../.." && pwd)"
main="$(dirname "$(git -C "$repo" rev-parse --path-format=absolute --git-common-dir)")"
cd "$repo/play"
node "$main/node_modules/tsx/dist/cli.mjs" ../server-rust/tools/analytics-catalog.ts > ../server-rust/crates/server/analytics-catalog.json
