#!/bin/sh
# Prints apiVersionHash exactly like `npm run tag-version` (messages/package.json) on a pristine checkout. The front
# reloads when its hash differs from the server's, and the server ignores a front template with another hash.
set -eu
cd "$(dirname "$0")/../messages"
if command -v sha1sum >/dev/null; then sha1=sha1sum; else sha1="shasum -a 1"; fi
$sha1 protos/messages.proto ../libs/messages/src/JsonMessages/* | $sha1 | cut -c1-8
