#!/usr/bin/env python3
"""Generate the first observer workspace map.

Purpose:
- Visualize the real nesting the user described:
  Mac command desk -> Windows host -> one parent Ubuntu environment (WSL-backed runtime) -> child Docker sandboxes.
- Pull a small real status snapshot from titan if available.
"""
from __future__ import annotations
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
STATE_PATH = Path(__file__).with_name('state').joinpath('titan-state.json')
state = {}
if STATE_PATH.exists():
    state = json.loads(STATE_PATH.read_text())

W, H = 50, 32
T_START = 444
T_COLLIDE = 443
T_FLOOR_BASE = 201
T_FLOOR_MAC = 212
T_FLOOR_WINDOWS = 223
T_FLOOR_UBUNTU = 234
T_FLOOR_CHILD = 235
T_TOP_LEFT = 49
T_TOP = 58
T_TOP_RIGHT = 50
T_LEFT = 45
T_RIGHT = 45
T_BOTTOM_LEFT = 59
T_BOTTOM = 58
T_BOTTOM_RIGHT = 60
T_PLANT = 245
T_BOX_YELLOW = 208
T_BOX_GRAY = 210
T_SOFA = 251
T_ORANGE_SEAT = 248
T_MONITOR_A = 216
T_MONITOR_B = 217
T_CHAIR = 250

containers = state.get('containers', [])
container_a = containers[0] if len(containers) > 0 else {'name': 'child docker A', 'status': 'unknown'}
container_b = containers[1] if len(containers) > 1 else {'name': 'child docker B', 'status': 'unknown'}
container_c = containers[2] if len(containers) > 2 else {'name': 'child docker C', 'status': 'empty'}


def pr_short(name: str) -> str:
    match = re.search(r'pr(\d+)', name or '', re.IGNORECASE)
    return f'PR {match.group(1)}' if match else 'no linked PR'


def status_short(value: str, max_len: int = 18) -> str:
    text = (value or 'unknown').replace(' (healthy)', ' healthy')
    return text if len(text) <= max_len else text[: max_len - 1] + '…'


def status_color(value: str) -> str:
    text = (value or '').lower()
    if 'healthy' in text or 'up' in text:
        return '#6b8f6d'
    if 'empty' in text or 'idle' in text:
        return '#b08a52'
    return '#b46a6a'


def grid(fill=0): return [fill for _ in range(W * H)]
def idx(x, y): return y * W + x

def set_tile(layer, x, y, tile):
    if 0 <= x < W and 0 <= y < H:
        layer[idx(x, y)] = tile

def fill_rect(layer, x, y, w, h, tile):
    for yy in range(y, y + h):
        for xx in range(x, x + w):
            set_tile(layer, xx, yy, tile)

def outline_room(walls, collisions, x, y, w, h, doors=None):
    doors = doors or set()
    for xx in range(x, x + w):
        if (xx, y) not in doors:
            set_tile(walls, xx, y, T_TOP if xx not in (x, x + w - 1) else (T_TOP_LEFT if xx == x else T_TOP_RIGHT))
            set_tile(collisions, xx, y, T_COLLIDE)
        if (xx, y + h - 1) not in doors:
            set_tile(walls, xx, y + h - 1, T_BOTTOM if xx not in (x, x + w - 1) else (T_BOTTOM_LEFT if xx == x else T_BOTTOM_RIGHT))
            set_tile(collisions, xx, y + h - 1, T_COLLIDE)
    for yy in range(y + 1, y + h - 1):
        if (x, yy) not in doors:
            set_tile(walls, x, yy, T_LEFT)
            set_tile(collisions, x, yy, T_COLLIDE)
        if (x + w - 1, yy) not in doors:
            set_tile(walls, x + w - 1, yy, T_RIGHT)
            set_tile(collisions, x + w - 1, yy, T_COLLIDE)

def text_obj(obj_id, x, y, text, width=220, height=48, size=16, color="#3d3d3d", halign="left"):
    return {"height": height, "id": obj_id, "name": "", "rotation": 0,
            "text": {"fontfamily": "Sans Serif", "pixelsize": size, "color": color, "halign": halign, "text": text, "wrap": True},
            "type": "", "visible": True, "width": width, "x": x, "y": y}

def area_obj(obj_id, name, x, y, w, h):
    return {"class": "area", "height": h, "id": obj_id, "name": name, "rotation": 0, "type": "area", "visible": True, "width": w, "x": x, "y": y}

def anchor_obj(obj_id, name, x, y):
    return {"height": 32, "id": obj_id, "name": name, "rotation": 0, "type": "", "visible": True, "width": 32, "x": x, "y": y}

start = grid(0); collisions = grid(0); floor = grid(T_FLOOR_BASE); walls = grid(0); furniture = grid(0)
for sy in (8, 9):
    for sx in (4, 5): set_tile(start, sx, sy, T_START)
fill_rect(floor, 1, 3, 12, 10, T_FLOOR_MAC)
fill_rect(floor, 1, 16, 12, 11, T_FLOOR_BASE)
fill_rect(floor, 15, 2, 32, 25, T_FLOOR_WINDOWS)
fill_rect(floor, 19, 7, 24, 15, T_FLOOR_UBUNTU)
fill_rect(floor, 21, 10, 8, 4, T_FLOOR_CHILD)
fill_rect(floor, 31, 10, 8, 4, T_FLOOR_CHILD)
fill_rect(floor, 26, 16, 10, 4, T_FLOOR_CHILD)
fill_rect(floor, 39, 7, 6, 15, T_FLOOR_BASE)
outline_room(walls, collisions, 1, 3, 12, 10, doors={(12, 8), (12, 9)})
outline_room(walls, collisions, 1, 16, 12, 11, doors={(12, 21), (12, 22)})
outline_room(walls, collisions, 15, 2, 32, 25, doors={(15, 8), (15, 9), (15, 21), (15, 22)})
outline_room(walls, collisions, 19, 7, 24, 15, doors={(19, 13), (19, 14), (42, 13), (42, 14)})
outline_room(walls, collisions, 21, 10, 8, 4, doors={(28, 11)})
outline_room(walls, collisions, 31, 10, 8, 4, doors={(31, 11)})
outline_room(walls, collisions, 26, 16, 10, 4, doors={(30, 16)})
outline_room(walls, collisions, 39, 7, 6, 15, doors={(39, 13), (39, 14)})
for x in (3, 6, 9): set_tile(furniture, x, 5, T_MONITOR_A)
for x in (4, 7, 10): set_tile(furniture, x, 6, T_CHAIR)
for x in (3, 6, 9): set_tile(furniture, x, 8, T_MONITOR_B)
for x in (4, 7, 10): set_tile(furniture, x, 9, T_CHAIR)
set_tile(furniture, 3, 19, T_BOX_YELLOW); set_tile(furniture, 5, 19, T_BOX_GRAY); set_tile(furniture, 7, 19, T_BOX_YELLOW)
set_tile(furniture, 9, 23, T_SOFA); set_tile(furniture, 4, 24, T_PLANT)
set_tile(furniture, 22, 11, T_BOX_YELLOW); set_tile(furniture, 24, 11, T_MONITOR_B)
set_tile(furniture, 32, 11, T_BOX_GRAY); set_tile(furniture, 34, 11, T_MONITOR_A)
set_tile(furniture, 28, 17, T_BOX_YELLOW); set_tile(furniture, 30, 17, T_BOX_GRAY); set_tile(furniture, 33, 17, T_ORANGE_SEAT)
set_tile(furniture, 41, 10, T_BOX_YELLOW); set_tile(furniture, 41, 12, T_BOX_GRAY); set_tile(furniture, 41, 17, T_BOX_YELLOW); set_tile(furniture, 41, 19, T_BOX_GRAY)
for y in (18, 20, 22, 24):
    set_tile(furniture, 10, y, T_BOX_GRAY if y % 4 == 0 else T_BOX_YELLOW)
for x in range(21, 39, 2):
    set_tile(furniture, x, 8, T_MONITOR_A if x % 4 == 1 else T_MONITOR_B)
for x in range(22, 39, 3):
    set_tile(furniture, x, 20, T_BOX_YELLOW if x % 2 == 0 else T_BOX_GRAY)
for x in (24, 26, 28, 30, 32, 34, 36):
    set_tile(furniture, x, 15, T_BOX_GRAY if x in (26, 32) else T_BOX_YELLOW)
for x in (23, 25, 27):
    set_tile(furniture, x, 12, T_CHAIR)
for x in (33, 35, 37):
    set_tile(furniture, x, 12, T_CHAIR)
set_tile(furniture, 23, 10, T_PLANT); set_tile(furniture, 37, 10, T_PLANT); set_tile(furniture, 27, 18, T_PLANT)
set_tile(furniture, 6, 21, T_MONITOR_B); set_tile(furniture, 7, 21, T_MONITOR_A); set_tile(furniture, 8, 21, T_MONITOR_B)
set_tile(furniture, 6, 22, T_CHAIR); set_tile(furniture, 7, 22, T_CHAIR); set_tile(furniture, 8, 22, T_CHAIR)
for y in (9, 11, 13, 15, 17, 19):
    set_tile(furniture, 40, y, T_BOX_YELLOW if y in (11, 17) else T_BOX_GRAY)
for y in (9, 14, 19):
    set_tile(furniture, 44, y, T_MONITOR_A if y == 14 else T_MONITOR_B)

objects = []; obj_id = 1
host_name = state.get('hostname', 'Titan / Windows host')
os_name = state.get('os', 'Ubuntu')
kernel = state.get('kernel', 'WSL2 kernel')
fetched = state.get('fetched_at', 'not yet fetched')
docker_count = state.get('docker_count', 0)
labels = [
    (2*32, 3.8*32, 'Mac control desk', 220, 28, 18, '#264653'),
    (2*32, 4.8*32, 'plan · review · dispatch', 220, 24, 13, '#6f7b80'),
    (2*32, 5.7*32, 'shell dock · status glance · decision point', 250, 22, 12, '#6f7b80'),
    (2*32, 16.8*32, 'GitHub / planning lane', 220, 28, 17, '#5a4a42'),
    (2*32, 17.8*32, 'facts · issues · PRs · next action', 240, 24, 13, '#8a7568'),
    (2*32, 18.8*32, f'focus · {pr_short(container_a["name"])}', 220, 22, 12, '#6b8f6d'),
    (2*32, 19.6*32, f'gateway · {status_short(container_b["status"], 20)}', 240, 22, 12, '#8f7133'),
    (2*32, 20.4*32, 'open board → choose target box → open shell', 260, 22, 12, '#8a7568'),
    (16*32, 2.8*32, f'{host_name}', 320, 28, 19, '#5a4a42'),
    (16*32, 3.8*32, 'Windows host boundary', 240, 24, 13, '#8a7568'),
    (16*32, 4.7*32, 'shell bridge · parent runtime · child task pods', 330, 24, 12, '#8a7568'),
    (20*32, 7.8*32, 'Ubuntu parent env', 230, 28, 18, '#355070'),
    (20*32, 8.8*32, f'{kernel}', 320, 24, 12, '#617f93'),
    (20*32, 9.6*32, f'{docker_count} child containers visible', 220, 24, 12, '#617f93'),
    (20*32, 20.8*32, 'queue rail · task traffic · shell routing', 260, 22, 12, '#617f93'),
    (21.6*32, 10.2*32, 'Issue sandbox', 140, 24, 15, '#355070'),
    (21.6*32, 11.0*32, f"{container_a['name'][:22]}", 190, 22, 12, '#617f93'),
    (21.6*32, 11.7*32, f"{pr_short(container_a['name'])} · {status_short(container_a['status'])}", 210, 22, 12, status_color(container_a['status'])),
    (21.6*32, 12.45*32, 'shell dock · code changes · validation', 220, 22, 12, '#617f93'),
    (31.6*32, 10.2*32, 'Gateway / review', 150, 24, 15, '#355070'),
    (31.6*32, 11.0*32, f"{container_b['name'][:22]}", 190, 22, 12, '#617f93'),
    (31.6*32, 11.7*32, f"live route · {status_short(container_b['status'])}", 210, 22, 12, status_color(container_b['status'])),
    (31.6*32, 12.45*32, 'service edge · checks · review handoff', 220, 22, 12, '#617f93'),
    (26.6*32, 16.2*32, 'Spare / validation slot', 180, 24, 15, '#355070'),
    (26.6*32, 17.0*32, f"{container_c['name'][:22]}", 190, 22, 12, '#617f93'),
    (26.6*32, 17.7*32, f"available · {status_short(container_c['status'])}", 210, 22, 12, status_color(container_c['status'])),
    (26.6*32, 18.45*32, 'sandbox slot · dry run · spare capacity', 220, 22, 12, '#617f93'),
    (39.5*32, 7.8*32, 'Status rail', 120, 24, 16, '#5a4a42'),
    (39.5*32, 9.0*32, 'host', 80, 18, 12, '#8a7568'),
    (41.0*32, 9.0*32, f'{host_name[:12]}', 140, 18, 12, '#5a4a42'),
    (39.5*32, 10.1*32, 'containers', 80, 18, 12, '#8a7568'),
    (41.3*32, 10.1*32, f'{docker_count}', 40, 18, 12, '#5a4a42'),
    (39.5*32, 11.2*32, 'A', 20, 18, 12, '#8a7568'),
    (40.1*32, 11.2*32, f"{pr_short(container_a['name'])}", 150, 18, 12, '#5a4a42'),
    (39.5*32, 12.3*32, 'B', 20, 18, 12, '#8a7568'),
    (40.1*32, 12.3*32, f"{status_short(container_b['status'])}", 150, 18, 12, '#5a4a42'),
    (39.5*32, 13.4*32, 'C', 20, 18, 12, '#8a7568'),
    (40.1*32, 13.4*32, f"{status_short(container_c['status'])}", 150, 18, 12, '#5a4a42'),
    (39.5*32, 15.2*32, 'shell', 80, 18, 12, '#8a7568'),
    (40.8*32, 15.2*32, 'tab-ready', 100, 18, 12, '#6b8f6d'),
    (39.5*32, 16.4*32, 'focus', 80, 18, 12, '#8a7568'),
    (40.8*32, 16.4*32, f'{pr_short(container_a["name"])}', 120, 18, 12, '#5a4a42'),
    (39.5*32, 17.6*32, 'next', 80, 18, 12, '#8a7568'),
    (40.8*32, 17.6*32, 'inspect → shell', 120, 18, 12, '#5a4a42'),
    (16*32, 28.2*32, f'Live snapshot · {fetched}', 500, 22, 13, '#5c5470'),
]
for x,y,txt,w,h,s,c in labels:
    objects.append(text_obj(obj_id, x, y, txt, width=w, height=h, size=s, color=c)); obj_id += 1
anchors = {'popupMac': (5*32, 4*32), 'popupGitHub': (5*32, 17*32), 'popupWindows': (23*32, 3*32), 'popupUbuntu': (25*32, 8*32), 'popupChildA': (22*32, 10*32), 'popupChildB': (32*32, 10*32), 'popupChildC': (27*32, 16*32), 'popupStatus': (40*32, 8*32)}
for name,(x,y) in anchors.items(): objects.append(anchor_obj(obj_id, name, x, y)); obj_id += 1
areas = [('macControl', 2*32, 4*32, 10*32, 8*32), ('githubLane', 2*32, 17*32, 10*32, 9*32), ('windowsHost', 16*32, 3*32, 30*32, 23*32), ('ubuntuParent', 20*32, 8*32, 22*32, 13*32), ('childDockerA', 22*32, 10*32, 7*32, 4*32), ('childDockerB', 31*32, 10*32, 8*32, 4*32), ('childDockerC', 26*32, 16*32, 10*32, 4*32), ('statusRail', 39*32, 8*32, 6*32, 13*32)]
for name,x,y,w,h in areas: objects.append(area_obj(obj_id, name, x, y, w, h)); obj_id += 1
map_data = {"compressionlevel": -1, "height": H, "infinite": False,
    "layers": [
        {"data": start, "height": H, "id": 1, "name": "start", "opacity": 1, "type": "tilelayer", "visible": True, "width": W, "x": 0, "y": 0},
        {"data": collisions, "height": H, "id": 2, "name": "collisions", "opacity": 1, "type": "tilelayer", "visible": True, "width": W, "x": 0, "y": 0},
        {"data": floor, "height": H, "id": 3, "name": "floor", "opacity": 1, "type": "tilelayer", "visible": True, "width": W, "x": 0, "y": 0},
        {"data": walls, "height": H, "id": 4, "name": "walls", "opacity": 1, "type": "tilelayer", "visible": True, "width": W, "x": 0, "y": 0},
        {"data": furniture, "height": H, "id": 5, "name": "furniture", "opacity": 1, "type": "tilelayer", "visible": True, "width": W, "x": 0, "y": 0},
        {"draworder": "topdown", "id": 6, "name": "workspaceObjects", "objects": objects, "opacity": 1, "type": "objectgroup", "visible": True, "x": 0, "y": 0},],
    "nextlayerid": 7, "nextobjectid": obj_id, "orientation": "orthogonal",
    "properties": [
        {"name": "mapName", "type": "string", "value": "Observer Workspace v1"},
        {"name": "mapDescription", "type": "string", "value": "First pass workspace map focused on real environment nesting instead of a fake town."},
        {"name": "mapLink", "type": "string", "value": "http://maps.workadventure.localhost/observer/workspace-v1.json"},
        {"name": "script", "type": "string", "value": "./workspace-v1.js"},],
    "renderorder": "right-down", "tiledversion": "2021.03.23", "tileheight": 32,
    "tilesets": [
        {"columns": 10, "firstgid": 1, "image": "../assets/tileset5_export.png", "imageheight": 320, "imagewidth": 320, "margin": 0, "name": "tileset5_export", "spacing": 0, "tilecount": 100, "tileheight": 32, "tilewidth": 32},
        {"columns": 10, "firstgid": 101, "image": "../assets/tileset6_export.png", "imageheight": 320, "imagewidth": 320, "margin": 0, "name": "tileset6_export", "spacing": 0, "tilecount": 100, "tileheight": 32, "tilewidth": 32},
        {"columns": 11, "firstgid": 201, "image": "../assets/tileset1.png", "imageheight": 352, "imagewidth": 352, "margin": 0, "name": "tileset1", "spacing": 0, "tilecount": 121, "tileheight": 32, "tilewidth": 32},
        {"columns": 11, "firstgid": 322, "image": "../assets/tileset1-repositioning.png", "imageheight": 352, "imagewidth": 352, "margin": 0, "name": "tileset1-repositioning", "spacing": 0, "tilecount": 121, "tileheight": 32, "tilewidth": 32},
        {"columns": 6, "firstgid": 443, "image": "../assets/Special_Zones.png", "imageheight": 64, "imagewidth": 192, "margin": 0, "name": "Special_Zones", "spacing": 0, "tilecount": 12, "tileheight": 32, "tilewidth": 32, "tiles": [{"id": 0, "properties": [{"name": "collides", "type": "bool", "value": True}]}]},],
    "tilewidth": 32, "type": "map", "version": 1.5, "width": W}

out = Path(__file__).with_name('workspace-v1.json')
out.write_text(json.dumps(map_data, ensure_ascii=False, indent=1) + '\n')
print(f'Wrote {out}')
