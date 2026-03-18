#!/usr/bin/env python3
from __future__ import annotations
import json, os, signal, subprocess, time
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
RUNTIME = ROOT / '.runtime'
RUNTIME.mkdir(exist_ok=True)
STATE = ROOT / 'maps' / 'observer' / 'state' / 'titan-state.json'
MAP = ROOT / 'maps' / 'observer' / 'state' / 'terminal-bridges.json'
TTYD = 'ttyd'

# Titan shell is provided by the standalone bridge on :7682.
BRIDGES = [
    {'key': 'titan', 'port': 7682, 'title': 'Titan Terminal', 'static': True},
]

if STATE.exists():
    state = json.loads(STATE.read_text())
    for i, c in enumerate(state.get('containers', [])[:3], start=1):
        BRIDGES.append({
            'key': f'container{i}',
            'port': 7682 + i,
            'title': f"{c['name']} shell",
            'container_name': c['name'],
            'cmd': [str(ROOT / 'scripts' / 'ssh_titan_container.sh'), c['name']],
        })


def stop_if_running(pid_file: Path):
    if not pid_file.exists():
        return
    try:
        pid = int(pid_file.read_text().strip())
        os.kill(pid, 0)
        os.kill(pid, signal.SIGTERM)
        time.sleep(0.3)
    except Exception:
        pass
    pid_file.unlink(missing_ok=True)

mapping = {'updated_at': time.strftime('%Y-%m-%dT%H:%M:%S%z'), 'bridges': []}
for bridge in BRIDGES:
    item = {
        'key': bridge['key'],
        'port': bridge['port'],
        'url': f"http://127.0.0.1:{bridge['port']}",
        'title': bridge['title'],
    }
    if bridge.get('static'):
        mapping['bridges'].append(item)
        continue

    pid_file = RUNTIME / f"{bridge['key']}.pid"
    log_file = RUNTIME / f"{bridge['key']}.log"
    stop_if_running(pid_file)
    with log_file.open('wb') as log:
        p = subprocess.Popen([
            TTYD, '-i', 'lo0', '-p', str(bridge['port']), '-W', '-t', f"titleFixed={bridge['title']}", *bridge['cmd']
        ], cwd=ROOT, stdout=log, stderr=subprocess.STDOUT)
    pid_file.write_text(str(p.pid))
    item['container_name'] = bridge['container_name']
    mapping['bridges'].append(item)

MAP.write_text(json.dumps(mapping, ensure_ascii=False, indent=2) + '\n')
print(json.dumps(mapping, ensure_ascii=False, indent=2))
