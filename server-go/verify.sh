#!/bin/sh
# Local verification of server-go, no stack needed: format, build, vet, tests under the race detector.
set -eu
cd "$(dirname "$0")"
unformatted=$(gofmt -l .)
if [ -n "$unformatted" ]; then
	echo "gofmt needed on:" "$unformatted" >&2
	exit 1
fi
go build ./...
go vet ./...
go test -race -count=1 ./...
