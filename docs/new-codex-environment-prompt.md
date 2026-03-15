# New Codex Environment Prompt

Use this when a fresh Codex session takes over development or deployment of this workspace project.

---

You are taking over a local/server deployment and iteration workflow for the `e2e-fix` saved workspace project inside the WorkAdventure repo.

## Your first job

Before proposing changes, inspect and align with what already exists.

Rules:

1. Search/inspect first, then infer.
2. Always prefer the smallest useful change.
3. Do not redesign the UI unless explicitly requested.
4. Validate the running UI yourself with a browser screenshot workflow whenever possible.

## Current accepted product state

- WorkAdventure is only the shell and entry point.
- The task workspace is a separate web app.
- The accepted UI is a dock-only desktop:
  - empty desktop on open
  - no top shell
  - no sidebar
  - only bottom dock remains
  - clicking dock icons opens floating windows
- Current task workspace: `e2e-fix`

## Read these files first

- `docs/workspace-handoff-2026-03-15.md`
- `docs/workadventure-mvp-setup.md`
- `docs/workspace-node-integration.md`
- `docs/workspace-server-deploy.md`
- `docs/workspace-bootstrap-skill.md`

## Important implementation files

- `workspace-app/src/App.tsx`
- `workspace-app/src/App.css`
- `workspace-config/e2e-fix.json`
- `workadventure-workspace/src/main.ts`
- `play/src/front/Connection/ConnectionManager.ts`
- `play/src/front/Connection/LocalUserStore.ts`

## Environment assumptions to verify

Check:

- current branch
- current git status
- whether `workspace-app` dependencies are installed
- whether Playwright Chromium is installed
- whether local ports are already in use:
  - `5174`
  - `4175`
  - `7681`
  - `7682`

## Browser validation requirement

If browser tooling is missing, install it early:

```bash
npx playwright install chromium
```

Use screenshots for self-validation, for example:

```bash
npx playwright screenshot --browser chromium 'http://127.0.0.1:5174/?workspace=e2e-fix&resetLayout=1' /tmp/workspace.png
```

## Known pitfalls

### 1. WorkAdventure root can restore stale cached room URLs

If root `/` loads a bad old room, inspect:

- `lastRoomUrl` in local storage
- cache `workavdenture-cache`

### 2. Sandbox may block local port binding

If a local preview/dev server fails with `EPERM`, use an escalated command.

### 3. Do not assume browser `127.0.0.1` means server localhost

For deployment tasks, config URLs must be reachable from the client browser.

### 4. Do not trust older docs that still mention tiled startup

The current accepted UX is dock-only desktop + floating windows.

## Deployment framing

If the task is deployment:

1. inspect `workspace-config/e2e-fix.json`
2. replace browser-local URLs with server-reachable URLs
3. build `workspace-app`
4. use `workspace-app/Dockerfile`
5. verify in browser after deploy

## New task creation framing

If the task is bootstrapping a new workspace:

- do not wire it by hand first
- use the planner model from `docs/workspace-bootstrap-skill.md`
- generate JSON + handoff
- separate planning from apply

---
