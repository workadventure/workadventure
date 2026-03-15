#!/usr/bin/env python3
"""Continuously refresh titan state, recent events, map labels and container bridges."""
from __future__ import annotations
import json
import subprocess
import sys
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
FETCH = ROOT / 'scripts' / 'fetch_titan_state.py'
GEN_MAP = ROOT / 'maps' / 'observer' / 'generate_workspace_v1.py'
BRIDGES = ROOT / 'scripts' / 'start_workspace_terminal_bridges.sh'
STATE = ROOT / 'maps' / 'observer' / 'state' / 'titan-state.json'
EVENTS = ROOT / 'maps' / 'observer' / 'state' / 'events.json'
INTERVAL = 4
MAX_EVENTS = 30

previous = None
if EVENTS.exists():
    try:
        event_doc = json.loads(EVENTS.read_text())
        events = event_doc.get('events', [])
    except Exception:
        events = []
else:
    events = []


def now_str():
    return time.strftime('%Y-%m-%dT%H:%M:%S%z')


def append_event(kind: str, message: str, container: str | None = None, status: str | None = None):
    entry = {'at': now_str(), 'kind': kind, 'message': message}
    if container is not None:
        entry['container'] = container
    if status is not None:
        entry['status'] = status
    events.insert(0, entry)
    del events[MAX_EVENTS:]


def write_events():
    EVENTS.write_text(json.dumps({'updated_at': now_str(), 'events': events}, ensure_ascii=False, indent=2) + '\n')


def container_map(state):
    return {c['name']: c for c in state.get('containers', [])}


def list_names(state):
    return [c['name'] for c in state.get('containers', [])]

while True:
    p = subprocess.run([sys.executable, str(FETCH)], cwd=ROOT)
    if p.returncode != 0:
        append_event('error', 'state fetch failed')
        write_events()
        time.sleep(INTERVAL)
        continue

    try:
        current = json.loads(STATE.read_text())
    except Exception:
        time.sleep(INTERVAL)
        continue

    names_changed = False
    if previous is None:
        append_event('sync', f"synced {current.get('docker_count', 0)} visible containers")
        names_changed = True
    else:
        prev_map = container_map(previous)
        cur_map = container_map(current)
        prev_names = set(prev_map)
        cur_names = set(cur_map)

        for name in sorted(cur_names - prev_names):
            append_event('container_added', f"container appeared: {name}", container=name, status=cur_map[name].get('status'))
            names_changed = True
        for name in sorted(prev_names - cur_names):
            append_event('container_removed', f"container disappeared: {name}", container=name, status=prev_map[name].get('status'))
            names_changed = True
        for name in sorted(cur_names & prev_names):
            if cur_map[name].get('status') != prev_map[name].get('status'):
                append_event('status_changed', f"status changed: {name}", container=name, status=cur_map[name].get('status'))
        if list_names(previous) != list_names(current):
            names_changed = True

    subprocess.run([sys.executable, str(GEN_MAP)], cwd=ROOT)
    if names_changed:
        subprocess.run([str(BRIDGES)], cwd=ROOT)

    write_events()
    previous = current
    time.sleep(INTERVAL)
