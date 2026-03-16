#!/usr/bin/env python3
from __future__ import annotations

import json
import subprocess
from datetime import datetime, timezone

CONTAINER_NAME = "kinopio-server"

SPACE_TEMPLATES = {
    "vQseEMSeafhTJW3vZJlkV": {
        "name": "Investigate Current Fix",
        "cards": [
            {
                "id": "task-investigate-title",
                "x": 96,
                "y": 112,
                "z": 1,
                "width": 260,
                "height": 88,
                "name": "Task · Investigate Current Fix\nrepo: ci_fix_ops\nbranch: main",
            },
            {
                "id": "task-investigate-focus",
                "x": 432,
                "y": 112,
                "z": 2,
                "width": 280,
                "height": 146,
                "name": "Focus\n- current failing behavior\n- GitHub summary and issue context\n- hypotheses, links, and evidence",
            },
            {
                "id": "task-investigate-output",
                "x": 208,
                "y": 320,
                "z": 3,
                "width": 328,
                "height": 146,
                "name": "Capture here\n- what is actually broken\n- what files or services look suspicious\n- what to check next before editing code",
            },
        ],
    },
    "aB1cTc2oEsaHG-Ti9yoi4": {
        "name": "Code Review Diff",
        "cards": [
            {
                "id": "task-code-title",
                "x": 96,
                "y": 112,
                "z": 1,
                "width": 248,
                "height": 88,
                "name": "Task · Code Review / Diff\nrepo: ci_fix_ops\nbranch: main",
            },
            {
                "id": "task-code-checklist",
                "x": 408,
                "y": 112,
                "z": 2,
                "width": 300,
                "height": 168,
                "name": "Review checklist\n- changed files and diffs\n- red / green evidence format\n- risky paths or regressions\n- next edit if the diff is wrong",
            },
            {
                "id": "task-code-output",
                "x": 188,
                "y": 336,
                "z": 3,
                "width": 352,
                "height": 148,
                "name": "Write down\n- what changed\n- why it matters\n- what still looks unsafe\n- what patch should happen next",
            },
        ],
    },
    "XAMHEvVoUpec-pU0btxvH": {
        "name": "Runtime Watch",
        "cards": [
            {
                "id": "task-runtime-title",
                "x": 96,
                "y": 112,
                "z": 1,
                "width": 240,
                "height": 88,
                "name": "Task · Runtime / Docker Watch\nrepo: ci_fix_ops\nbranch: main",
            },
            {
                "id": "task-runtime-focus",
                "x": 404,
                "y": 112,
                "z": 2,
                "width": 312,
                "height": 168,
                "name": "Watch here\n- ws docker state\n- recent logs and failures\n- container names / restarts\n- what runtime action to try next",
            },
            {
                "id": "task-runtime-output",
                "x": 196,
                "y": 336,
                "z": 3,
                "width": 352,
                "height": 148,
                "name": "Capture\n- failing container or command\n- log lines worth keeping\n- current runtime status\n- follow-up action for titan",
            },
        ],
    },
}

NODE_PATCH_SCRIPT = r"""
const fs = require('fs');
const path = require('path');

const payload = JSON.parse(fs.readFileSync(0, 'utf8'));
const backupRoot = '/data/kinopio/backups';
const spacesRoot = path.join(backupRoot, 'spaces');
const latestPath = '/data/kinopio/runtime/latest.json';
const manualBackupRoot = path.join(backupRoot, 'manual-task-space-bootstrap');
const manualBackupDir = path.join(manualBackupRoot, payload.timestamp);

fs.mkdirSync(manualBackupDir, { recursive: true });
const copy = (src) => fs.copyFileSync(src, path.join(manualBackupDir, path.basename(src)));
const patchSpace = (space, template) => ({
  ...space,
  name: template.name,
  cards: template.cards.map((card) => ({
    id: card.id,
    x: card.x,
    y: card.y,
    z: card.z,
    width: card.width,
    height: card.height,
    name: card.name,
    userId: null,
    isCreatedThroughPublicApi: true,
    spaceId: space.id,
  })),
  connections: [],
  connectionTypes: [],
  boxes: [],
  lines: [],
  lists: [],
  drawingStrokes: [],
  drawingImage: '',
  previewImage: null,
  previewThumbnailImage: null,
  editedAt: payload.editedAt,
});

copy(latestPath);
const latest = JSON.parse(fs.readFileSync(latestPath, 'utf8'));
const patched = {};

for (const [spaceId, template] of Object.entries(payload.templates)) {
  const spacePath = path.join(spacesRoot, `${spaceId}.json`);
  copy(spacePath);
  const current = JSON.parse(fs.readFileSync(spacePath, 'utf8'));
  const next = patchSpace(current, template);
  fs.writeFileSync(spacePath, `${JSON.stringify(next, null, 2)}\n`);
  patched[spaceId] = next;
}

latest.spaces = (latest.spaces || []).map((space) => patched[space.id] || space);
latest.savedAt = payload.editedAt;
fs.writeFileSync(latestPath, `${JSON.stringify(latest, null, 2)}\n`);

process.stdout.write(JSON.stringify({
  ok: true,
  editedAt: payload.editedAt,
  manualBackupDir,
  spaces: Object.values(patched).map((space) => ({
    id: space.id,
    name: space.name,
    cards: space.cards.length,
  })),
}, null, 2));
"""


def main() -> None:
    edited_at = datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")
    timestamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    payload = {
        "editedAt": edited_at,
        "timestamp": timestamp,
        "templates": SPACE_TEMPLATES,
    }
    proc = subprocess.run(
        ["docker", "exec", "-i", CONTAINER_NAME, "node", "-e", NODE_PATCH_SCRIPT],
        input=json.dumps(payload, ensure_ascii=False),
        text=True,
        capture_output=True,
        check=False,
    )
    if proc.returncode != 0:
        raise RuntimeError(proc.stderr.strip() or proc.stdout.strip() or f"docker exec failed with {proc.returncode}")
    print(proc.stdout.strip())


if __name__ == "__main__":
    main()
