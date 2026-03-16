#!/usr/bin/env bash
set -euo pipefail

mkdir -p /home/ubuntu/.ssh
touch /home/ubuntu/.ssh/authorized_keys

if [ -f /authorized_keys/authorized_keys ]; then
  cp /authorized_keys/authorized_keys /home/ubuntu/.ssh/authorized_keys
fi

if [ -f /authorized_keys/id_ed25519.pub ]; then
  cat /authorized_keys/id_ed25519.pub >> /home/ubuntu/.ssh/authorized_keys
fi

chown -R ubuntu:ubuntu /home/ubuntu/.ssh
chmod 700 /home/ubuntu/.ssh
chmod 600 /home/ubuntu/.ssh/authorized_keys

exec /usr/sbin/sshd -D -e
