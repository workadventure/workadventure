#!/bin/sh
# Generates spacestate.gen.go from the zod schema. tsx runs from a temporary directory: the repository's
# node_modules are installed for Linux, and the local tsx would pick their esbuild.
set -e
dir=$(cd "$(dirname "$0")" && pwd)
cd "$(mktemp -d)"
npx -y tsx@4.22.3 "$dir/emit.mts" > "$dir/spacestate.gen.go"
gofmt -w "$dir/spacestate.gen.go"
