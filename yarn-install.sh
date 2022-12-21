#!/bin/bash

set -e

# This small script is in charge of running "yarn install" but ensuring only one yarn install runs at a given time
# This is useful on dev containers startup where all containers will start with a "yarn install" to ensure libs
# are correctly installed

SCRIPT_DIR=$( cd -- "$( dirname -- "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )

cd "$SCRIPT_DIR"
flock ./install.lock -c "yarn install"
