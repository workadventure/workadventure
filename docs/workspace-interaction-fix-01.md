# Workspace interaction fix 01

Date: 2026-03-14

## Problem
The previous workspace pass only showed labels on the map.
The expected interaction did not actually trigger in a reliable way, so the result felt like a static diagram instead of a live workspace.

## Root cause
The map used named `area` objects, but the script listened with `WA.room.onEnterZone(...)`.
For area objects, the correct API is:
- `WA.room.area.onEnter(name)`
- `WA.room.area.onLeave(name)`

So the interaction wiring was wrong.

## Fix applied
- switched interaction code to `WA.room.area.onEnter/onLeave`
- added a persistent right-side inspector UI website
- entering an area now:
  - opens/updates the inspector
  - shows a popup anchored in-world
  - shows an action message that can be confirmed with space
- inspector polls `observer/state/titan-state.json` every 4 seconds

## Result
The workspace is no longer only a manually refreshed diagram.
It now behaves more like a live monitoring surface:
- context follows the area you enter
- details panel stays open on the right
- titan state keeps refreshing automatically

## Remaining gap
This is now live polling, not a true interactive SSH terminal session.
If we want the room to feel like a real open terminal channel, the next step is adding a terminal bridge such as a secure ttyd/wetty-style panel behind auth.
