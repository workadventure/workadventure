#!/bin/bash
apt update
apt-get install -y gettext-base

set -e
#set -x

# Check if all variables used in the template is defined or not
grep -o '\${[0-9A-Za-z_]*}' /data/homeserver.template.yaml | while read line
do
    line=$(echo "$line" | sed 's/^..//' | sed 's/.$//')
    if [[ -z `printenv $line` ]]; then
      echo "---------------------------------------------"
      echo "------------------- ERROR -------------------"
      echo "Environment variable $line key is not defined"
      echo "---------------------------------------------"
      exit 1
    fi
done

envsubst < /data/homeserver.template.yaml > /data/homeserver.yaml

cd /data
python -m synapse.app.homeserver \
    --config-path /data/homeserver.yaml \
    --generate-config \
    --report-stats=yes
exec "/start.py"