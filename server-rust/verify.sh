#!/usr/bin/env sh
# The one local check, no stack needed: build, lint (warnings are errors), tests.
set -eu
cd "$(dirname "$0")"
cargo build --all-targets
cargo clippy --all-targets -- -D warnings
cargo test
