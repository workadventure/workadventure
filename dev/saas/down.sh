#!/bin/sh
# Stops wa-saas-go. Data (DB, maps, S3) are kept; PURGE=1 also drops the project's volumes (-v, this project only).
set -eu
. "$(dirname "$0")/common.sh"
if [ "${PURGE:-}" = 1 ]; then dc down -v --remove-orphans; else dc down --remove-orphans; fi
