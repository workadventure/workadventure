# Action reliability fix 01

Date: 2026-03-14

## Problem
The bottom message looked like a clickable interaction surface, but it was only a trigger message.
That made it feel broken when clicked.

The terminal open path also needed a more reliable behavior.

## Fix
- stop treating the bottom message as the main action surface
- keep it only as a hint for opening inspector
- treat action bar buttons as the primary reliable interaction path
- open terminal via `WA.nav.openTab(...)` first, with modal fallback

## Result
Users should now use:
- `Inspector` in the action bar to inspect
- `Terminal` in the action bar to act

The bottom message is now only guidance, not the main clickable control.
