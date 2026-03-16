#!/bin/bash

set -e

# This small script is in charge of running "npm install" but ensuring only one npm install runs at a given time
# This is useful on dev containers startup where all containers will start with a "npm install" to ensure libs
# are correctly installed

SCRIPT_DIR=$( cd -- "$( dirname -- "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )

cd "$SCRIPT_DIR"
echo "Waiting for lock to trigger npm install"
flock ./install.lock -c "DEBUG= npm install"
echo "Finished npm install"