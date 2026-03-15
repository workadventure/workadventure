# Workspace ops pass 02

Date: 2026-03-14

## What improved
This pass makes the workspace feel more like an operations console.

### Clear shell semantics
Action bar now exposes:
- `Inspector`
- `Context Shell`
- `Titan Shell`

So there is no longer one ambiguous `Terminal` entry.

### Inspector improvements
- recent events feed from `events.json`
- context-aware shell actions
- per-container shell buttons
- per-container copy-name buttons
- `Open PR` button when a container name matches a known PR pattern

### Background automation
The titan watcher now:
- refreshes titan state
- regenerates the workspace labels
- emits recent events
- rebuilds container shell bridges when visible containers change
