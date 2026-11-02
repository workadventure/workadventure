#!/usr/bin/env sh
# The protocol hash the front is built with (apiVersionHash), as messages/package.json "tag-version" computes it:
# sha1 of messages.proto and libs/messages/src/JsonMessages/*, 8 characters. The server itself reads the hash of the
# front it serves (GET /api-version); this script is for the image contract of dev/rehearsal.
set -eu
cd "$(dirname "$0")/../messages"
sum() { if command -v sha1sum >/dev/null 2>&1; then sha1sum "$@"; else shasum -a 1 "$@"; fi; }
sum protos/messages.proto ../libs/messages/src/JsonMessages/* | sum | cut -c1-8
