#!/bin/sh
# Regenerates catalog.json from libs/messages/src/JsonMessages/AnalyticsEventCatalog.ts (needs the repository's
# node_modules). TestTheSchemasMatchTheTSCatalog fails when it is stale.
set -eu
cd "$(dirname "$0")/../../.."
npx --no-install tsx server-go/internal/analytics/gen/catalog.ts > server-go/internal/analytics/catalog.json
