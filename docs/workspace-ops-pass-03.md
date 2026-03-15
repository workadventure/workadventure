# Workspace ops pass 03

Date: 2026-03-14

## What changed
This pass focuses on making the workspace easier to read as a real operating surface instead of a static diagram.

### 1. Softer, more functional map dressing
The map generator now adds more visual structure to each region:
- Mac control desk feels more like a command position
- GitHub lane shows active-focus hints instead of only a label
- Ubuntu parent space reads more like a parent runtime with internal traffic
- child docker rooms have clearer role chips and status text
- status rail now reads like a quick glance strip

### 2. Inspector is more context-aware
The inspector now explains the currently focused region instead of only listing raw machine info.

For each region it now shows:
- what this area means
- where it sits in the nesting path
- what the next sensible action is
- which shell bridge is relevant
- linked PR shortcut when a container name implies one

### 3. Faster operational jumps
The inspector now exposes:
- `Open Context Shell`
- `Open Titan Shell`
- `Open Current PR`
- `Focus Here` for each visible container

This makes the inspector closer to a real control surface.

## Why these changes
The user's core problem is not “lack of 3D” by itself.
The real problem is loss of cognitive grip when multiple nested environments and tasks exist at once.

So this pass biases toward:
- clearer hierarchy
- lower-friction jumps into the right shell
- better mapping from visual zone -> real task -> real action

## Intended feeling improvement
These changes aim to make the workspace feel:
- calmer
- less like a debug wall
- more like a readable operations room
- more trustworthy because buttons now lead to real surfaces
