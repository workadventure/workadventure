# Terminal bridge 01

Date: 2026-03-14

## Goal
Move from read-only status display to a real interactive terminal surface for titan.

## What was added
### Local terminal bridge
Installed:
- `ttyd 1.7.7`

Started local bridge:
- local URL: `http://127.0.0.1:7682`
- command behind it: `ssh titan`

Scripts:
- `scripts/start_titan_terminal_bridge.sh`
- `scripts/stop_titan_terminal_bridge.sh`
- `scripts/status_titan_terminal_bridge.sh`

### Background live state updater
Scripts:
- `scripts/watch_titan_state.py`
- `scripts/start_titan_state_watcher.sh`
- `scripts/stop_titan_state_watcher.sh`
- `scripts/status_titan_state_watcher.sh`

This turns the previously static JSON snapshot into a continuously refreshed local state feed.

### Workspace integration
- popup now includes `Open Terminal`
- inspector now includes `Open Terminal`
- action bar now includes `Terminal`
- terminal opens as a modal iframe and can be closed from the built-in modal close button or by clicking the action bar button again

## Current behavior
- inspector = live monitor
- terminal = real interactive shell session into titan via ssh

## Remaining caveat
The terminal is real and interactive, but it is still a raw shell session.
The next safety/product step would be role-based commands or a task-oriented command surface on top of it.
