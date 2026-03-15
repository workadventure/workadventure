# Workspace ops pass 01

Date: 2026-03-14

## What changed
This pass makes the workspace feel less like a passive monitor and more like a place you can act from.

### Added per-container shell bridges
Current local bridge layout:
- `:7682` titan shell
- `:7683` first visible container shell
- `:7684` second visible container shell

Bridge metadata is written to:
- `maps/observer/state/terminal-bridges.json`

### Inspector upgrades
- `Open Context Shell`
- `Open Titan Shell`
- `Copy Context Name`
- per-container `Shell` button
- per-container `Copy Name` button

### Context-aware terminal behavior
The action bar `Terminal` button now opens:
- current child container shell if you are inside a child docker zone
- otherwise the titan shell

## Why this matters
The workspace is no longer only:
- status
- labels
- one generic terminal

It now starts to map actions onto the structure itself:
- choose the environment
- open the relevant shell
- keep the top-level titan shell available when needed
