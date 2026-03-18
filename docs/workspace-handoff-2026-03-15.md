# Saved Workspace Handoff

Date: 2026-03-15
Audience: next Codex session / next developer

## 1. What is finished

The current accepted MVP is:

- WorkAdventure used only as the space shell
- one task workspace: `e2e-fix`
- independent web app embedded in WA co-website
- dock-only desktop UI
- floating app windows
- Finder file browser
- ttyd terminal bridges
- local-only single-user flow

## 2. Current accepted UI

Do **not** revert this unless explicitly requested:

- no top shell
- no sidebar
- no automatic panels on startup
- only bottom dock remains
- clicking dock icons opens floating windows

This was user-approved after several iterations.

## 3. Key files

### Workspace app

- `workspace-app/src/App.tsx`
- `workspace-app/src/App.css`
- `workspace-app/src/file-manager.tsx`
- `workspace-app/src/icons.tsx`
- `workspace-config/e2e-fix.json`

### WorkAdventure shell

- `workadventure-workspace/e2e-fix-ops-room.tmj`
- `workadventure-workspace/src/main.ts`
- `maps/e2e-fix-mvp/e2e-fix-ops-room.tmj`

### Helpers

- `scripts/start_e2e_fix_ubuntu_container.sh`
- `scripts/start_workspace_file_service.sh`
- `scripts/start_workspace_terminal_bridges.sh`
- `scripts/workspace_file_service.mjs`

### WorkAdventure stale room fix

- `play/src/front/Connection/ConnectionManager.ts`
- `play/src/front/Connection/LocalUserStore.ts`

## 4. What was a real problem during development

### A. UI drift

The user strongly dislikes improvised UI.

Rule:

- search / align first
- make the smallest useful change
- do not invent large new shells unless asked

### B. Need self-verification

Do not rely on the user to describe the UI every time.

Install browser tooling early:

```bash
npx playwright install chromium
```

Then verify with screenshots:

```bash
npx playwright screenshot --browser chromium 'http://127.0.0.1:5174/?workspace=e2e-fix&resetLayout=1' /tmp/workspace.png
```

### C. WorkAdventure root room restore bug

Root `/` could restore an obsolete cached room URL like:

```text
https://localhost:5173/e2e-fix-ops-room.tmj
```

This is now mitigated in the WA front code, but if the browser still behaves strangely:

- clear `lastRoomUrl`
- clear cache `workavdenture-cache`
- or use the direct room URL once

### D. Sandbox port binding

In this environment, starting a dev server inside sandbox may fail with:

- `EPERM`

If you need a browser-visible local server for validation, use escalated preview/dev commands.

## 5. Build/validation status

### Validated

- `workspace-app`: `npm run build`
- local screenshot validation with Playwright Chromium

### Not a safe global signal

The full `play` workspace build is not a reliable validation signal for this task because the upstream WA repo has unrelated front build issues in this environment.

## 6. Current open product direction

The next meaningful product step is **not UI redesign**.

It is lower-friction workspace creation:

- new task
- new docker/runtime targets
- new Codex session
- generated workspace JSON

See:

- `docs/workspace-bootstrap-skill.md`

## 7. Current deployment direction

For server deployment, the smallest path is:

- build `workspace-app`
- serve it in one Docker container
- point config URLs to server-reachable ttyd / file-service endpoints

See:

- `docs/workspace-server-deploy.md`

## 8. What not to forget

1. keep changes minimal
2. use existing solutions before inventing new ones
3. validate UI yourself with a browser
4. do not silently reintroduce tiled-by-default startup
5. do not assume `localhost` URLs are valid for deployed browser clients
