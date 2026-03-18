# Workspace inspector UX 01

Date: 2026-03-14

## User complaints addressed
- the inspector was always stuck on the right
- it could not be closed
- it could not be minimized
- it looked interactive, but was really just a fixed read-only panel

## What changed
- inspector no longer auto-opens on project load
- entering a zone now only offers interaction:
  - popup button
  - space-bar action message
- action bar `Inspector` button now toggles open/close
- inspector has explicit:
  - Refresh
  - Overview
  - Minimize
  - Close
- minimized mode shrinks to a small bottom-right card instead of occupying the full panel

## Important product truth
Current inspector is a **read-only live monitor**.
It is not yet a command surface and not yet an embedded SSH terminal.

That distinction matters:
- now: live status visibility
- later: controlled actions / terminal bridge
