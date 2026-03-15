#!/usr/bin/env python3
"""Fetch a small read-only snapshot from titan and write JSON for the workspace map.

Usage:
  python3 scripts/fetch_titan_state.py

Preconditions:
- ~/.ssh/config contains a working `Host titan`
- the current Mac public key is authorized on titan
"""
from __future__ import annotations
import json
import shlex
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'maps' / 'observer' / 'state' / 'titan-state.json'
SSH = ['ssh', '-F', str(Path.home() / '.ssh' / 'config'), '-o', 'BatchMode=yes', 'titan']

REMOTE = r'''
python3 - <<'PY2'
import json, subprocess, os, socket

def run(cmd):
    p = subprocess.run(cmd, shell=True, text=True, capture_output=True)
    return p.stdout.strip()

rows = run("docker ps --format '{{json .}}'").splitlines()
containers = []
for row in rows:
    if not row.strip():
        continue
    item = json.loads(row)
    containers.append({
        'name': item.get('Names',''),
        'image': item.get('Image',''),
        'status': item.get('Status',''),
    })

state = {
    'hostname': socket.gethostname(),
    'kernel': run('uname -r'),
    'os': run(". /etc/os-release && printf '%s' \"$PRETTY_NAME\""),
    'docker_count': len(containers),
    'containers': containers,
    'fetched_at': run('date -Is'),
}
print(json.dumps(state, ensure_ascii=False))
PY2
'''

proc = subprocess.run(SSH + [REMOTE], text=True, capture_output=True)
if proc.returncode != 0:
    raise SystemExit(proc.stderr.strip() or f'ssh failed: {proc.returncode}')
state = json.loads(proc.stdout.strip())
OUT.write_text(json.dumps(state, ensure_ascii=False, indent=2) + '\n')
print(f'wrote {OUT}')
print(json.dumps(state, ensure_ascii=False, indent=2))
