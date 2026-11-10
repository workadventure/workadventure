#!/usr/bin/env sh
# Regenerates crates/server/openapi/{pusher,admin}.json from the pusher's sources (JSDoc and zod schemas), as its
# SwaggerController builds them at startup. The output is committed: the server embeds it. Needs the repository's
# node_modules (host binaries); the dummy variables only satisfy the pusher's configuration check on import.
set -eu
here="$(cd "$(dirname "$0")" && pwd)"
repo="$(cd "$here/../.." && pwd)"
main="$(dirname "$(git -C "$repo" rev-parse --path-format=absolute --git-common-dir)")"
cd "$repo/play"
API_URL=back:50051 ICON_URL=http://icon MAP_STORAGE_API_TOKEN=x SECRET_KEY=x UPLOADER_URL=http://uploader \
    node "$main/node_modules/tsx/dist/cli.mjs" --tsconfig ../server-rust/tools/tsconfig.json ../server-rust/tools/openapi.ts ../server-rust/crates/server/openapi > /dev/null
