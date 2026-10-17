#!/bin/sh
# Local verification of server-go, no stack needed: format, build, vet, lint (when golangci-lint is installed, as
# in the CI), tests under the race detector.
set -eu
cd "$(dirname "$0")"
unformatted=$(gofmt -l .)
if [ -n "$unformatted" ]; then
	echo "gofmt needed on:" "$unformatted" >&2
	exit 1
fi
go build ./...
go vet ./...
if command -v golangci-lint >/dev/null; then
	golangci-lint run ./...
else
	echo "golangci-lint not installed: lint skipped (the CI runs it)" >&2
fi
go test -race -count=1 ./...
