# Workspace map v1

Date: 2026-03-14
Branch: `codex`

## Why this pass exists
The goal of this pass is to stop flattening the runtime model into sibling boxes.
The first thing to make visible is the real nesting:

- Mac control desk
- MSI Titan GT77 / Windows host
- one parent Ubuntu Docker running under the Windows host
- WSL as runtime substrate for that parent Linux environment
- multiple child Docker sandboxes inside that parent execution box

## Corrected hierarchy
Previous simplification that treated `WSL` and `Docker` as side-by-side lanes was wrong for this use case.
For this workspace, the right mental model is:

`Windows host -> parent Ubuntu Docker (WSL-backed runtime) -> child Docker sandboxes`

So in the visual layer:
- `Windows` should be the outer host container
- `Ubuntu Docker` should be the parent execution chamber inside it
- child task containers should live inside that chamber
- `WSL` should be expressed as an implementation note / substrate, not as a separate peer room

## What changed
Created a first-pass map at:
- `maps/observer/workspace-v1.json`
- `maps/observer/workspace-v1.js`

Generated from:
- `maps/observer/generate_workspace_v1.py`

Changed startup room in:
- `.env`

## Map structure in v1
- Left top: Mac control desk
- Left bottom: GitHub / planning lane
- Main outer room: MSI Titan GT77 / Windows host
- Nested inside: parent Ubuntu Docker
- Nested inside that: 3 child Docker rooms
- Right side: compact status rail

## Interaction in v1
Entering a zone opens a short popup explaining:
- what that box represents
- how it relates to the real runtime stack
- example task / state for that area

## Validation
Open either:
- `http://play.workadventure.localhost/`
- or directly `http://play.workadventure.localhost/_/global/maps.workadventure.localhost/observer/workspace-v1.json`

Expected result:
- no fake town
- no roofed building
- you start in the Mac control area
- the Windows host is visibly the outer execution container
- the Ubuntu parent box is visibly nested inside it
- child Docker boxes are visibly nested inside the Ubuntu parent box
