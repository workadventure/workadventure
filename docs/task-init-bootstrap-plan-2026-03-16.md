# Task Init Bootstrap Plan · 2026-03-16

## What shipped

This pass keeps the scope intentionally small:

1. `task init` can start from a single real GitHub link
2. it creates `out/bootstrap-plan.json` inside the remote workspace
3. the task-init page renders that bootstrap plan
4. the Codex init prompt and repo-local `AGENTS.md` both reference the plan

The goal is not to build a large task system yet. The goal is to make task init
explain:

- what kind of repo this is
- which files proved that
- which tools are required
- which tools already exist in the current workspace image
- what is missing / blocked
- what the next minimal action should be

## Why this exists

The earlier flow could clone a repo and start Codex, but it was still too easy
to end up in a vague state like “install is broken”.

The new bootstrap plan makes the first diagnosis mechanical before asking Codex
to reason:

- detect repo signals from files already in the repo
- compare them with the current remote workspace image
- save the result as task state
- give Codex the same trace and plan

## Current bootstrap plan shape

`out/bootstrap-plan.json` currently stores:

- `runtimeHost`
- `workspaceName`
- `workspacePath`
- `repoPath`
- `planPath`
- `detectedStacks`
- `primaryStack`
- `evidenceFiles`
- `requiredTools`
- `availableTools`
- `missingTools`
- `bootstrapCommands`
- `networkStrategy`
- `networkTuning`
- `blockedReason`
- `recommendedNextAction`

This is intentionally small and easy to extend later.

## Reuse hooks left for future hosts

The code still works for the current Titan setup, but it no longer assumes the
display text must always be hard-coded forever.

Environment hooks added / used:

- `WORKSPACE_REMOTE_LABEL` (default: `Titan`)
- `WORKSPACE_REMOTE_SSH_TARGET`
- `WORKSPACE_REMOTE_TERMINAL_PATH`

These are enough for the current task-init UI and prompt layer to be reused for
another machine later without rewriting the whole feature.

## Known limit kept on purpose

This pass does **not** try to auto-install every missing runtime.

Example:

- `kubernetes-sigs/kueue` is detected as a Go repo
- current ws image does not have `go`
- bootstrap plan marks the task as blocked instead of pretending install is in progress

That is deliberate. The system should diagnose the gap first.

## Main files touched in this pass

- `scripts/workspace_task_service.py`
- `workspace-app/public/apps/task-init.html`
- `workspace-config/e2e-fix.json`

## Recommended next step after this pass

Do not add more UI first.

Instead, improve workspace images / bootstrap execution using the plan:

- either install missing toolchains into the ws image
- or choose/switch to a better workspace image per detected stack
