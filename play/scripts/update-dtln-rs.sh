#!/usr/bin/env bash

set -euo pipefail

mkdir -p "$(dirname "$0")/../public/static/dtln"

curl -fsSL \
    "https://raw.githubusercontent.com/DataDog/dtln-rs-demo/main/src/audio-worklet/dtln.js" \
    -o "$(dirname "$0")/../public/static/dtln/dtln.js"

curl -fsSL \
    "https://raw.githubusercontent.com/DataDog/dtln-rs/main/LICENSE" \
    -o "$(dirname "$0")/../public/static/dtln/dtln-rs-LICENSE.txt"

curl -fsSL \
    "https://raw.githubusercontent.com/DataDog/dtln-rs/main/NOTICE" \
    -o "$(dirname "$0")/../public/static/dtln/dtln-rs-NOTICE.txt"

curl -fsSL \
    "https://raw.githubusercontent.com/DataDog/dtln-rs/main/LICENSE-3rdparty.csv" \
    -o "$(dirname "$0")/../public/static/dtln/dtln-rs-LICENSE-3rdparty.csv"

echo "Updated dtln-rs vendor files."
