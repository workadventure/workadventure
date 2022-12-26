#!/bin/bash

set -e

# This small script is in charge of running "pnpm install" but ensuring only one pnpm install runs at a given time
# This is useful on dev containers startup where all containers will start with a "pnpm install" to ensure libs
# are correctly installed

sudo npm install -g pnpm

SCRIPT_DIR=$( cd -- "$( dirname -- "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )

cd "$SCRIPT_DIR"
flock ./install.lock -c "DEBUG= pnpm install"
