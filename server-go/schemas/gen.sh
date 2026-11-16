#!/bin/sh
# zod → JSON Schema (export.mts, with the repository's node_modules) → Go types (go-jsonschema, a tool of go.mod).
# tsx runs from a temporary directory: the repository's node_modules may be installed for another OS, and a local
# tsx would pick their esbuild.
set -e
here=$(cd "$(dirname "$0")" && pwd)
root=$(cd "$here/.." && pwd)
(cd "$(mktemp -d)" && npx -y tsx@4.22.3 "$here/export.mts")
cd "$root"
models() { # package dir, root type
    go tool go-jsonschema --only-models --disable-custom-types-for-maps --tags json --capitalization ID --capitalization IDs --capitalization URL --capitalization UUID \
        -p "$(basename "$1")" --schema-root-type "$(basename "$1").schema.json=$2" -o "$1/$(basename "$1").gen.go" \
        "$1/$(basename "$1").schema.json"
}
models internal/spacestate SpaceState
models internal/admin MapDetailsData
