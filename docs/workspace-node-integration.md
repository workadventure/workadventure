# Workspace Node Integration Notes

Date: 2026-03-15

## Source of truth

Current workspace config:

- `workspace-config/e2e-fix.json`

Current UI shell:

- `workspace-app/src/App.tsx`
- `workspace-app/src/App.css`

## Current runtime model

- one named workspace: `e2e-fix`
- default state: empty desktop
- only persistent launcher UI: bottom dock
- app windows open as Dockview floating groups
- layout persists automatically in browser `localStorage`

Current layout storage key:

- `saved-workspace-layout:e2e-fix:v7`

Current URL override storage key:

- `saved-workspace-url-overrides:e2e-fix`

## App wiring

### 1. GitHub

- node type: `web`
- default URL: `/mock/github.html`
- current status: placeholder web app

Use a real task-specific GitHub page later by editing:

- `workspace-config/e2e-fix.json`

Recommended eventual direction:

- use task-specific PR/issue query URLs
- do not rely on raw homepage embedding

### 2. ChatGPT

- node type: `web`
- default URL: `/mock/chatgpt.html`
- current status: placeholder web app

Later replacement:

- internal wrapper page
- or a task-specific link page

### 3. Codex Terminal

- node type: `terminal`
- URL: `http://127.0.0.1:7681`
- bridge: `ttyd`

Local command:

```bash
ttyd -W -i 127.0.0.1 -p 7681 zsh
```

Recommended second step:

- replace `zsh` with your real Codex shell entry
- or point ttyd at a task-specific worktree shell

### 4. Docker Ubuntu Terminal

- node type: `terminal`
- URL: `http://127.0.0.1:7682`
- bridge: `ttyd`

Current simplest command:

```bash
ttyd -W -i 127.0.0.1 -p 7682 docker run --rm -it ubuntu:22.04 bash
```

Preferred long-lived command:

```bash
ttyd -W -i 127.0.0.1 -p 7682 docker exec -it e2e-fix-ubuntu bash
```

### 5. Review / Update

- node type: `review`
- rendered from static JSON in `workspace-config/e2e-fix.json`

Later replacement:

- generated task summary JSON
- or a local task state feed

### 6. Finder

- node type: `files`
- service URL: `http://127.0.0.1:4175`

Service:

```bash
cd workspace-app
npm run files
```

What Finder currently does:

- always exposes host repo root
- auto-detects running Docker containers
- shows Ubuntu container sources if available

## WorkAdventure connection

Map source:

- `workadventure-workspace/e2e-fix-ops-room.tmj`
- `workadventure-workspace/src/main.ts`

Published room:

- `maps/e2e-fix-mvp/e2e-fix-ops-room.tmj`

Current connection flow:

1. player enters `workspaceStationTrigger`
2. popup appears
3. clicking open launches:

```ts
WA.nav.openCoWebSite('http://127.0.0.1:5174/?workspace=e2e-fix', ...)
```

This still uses WorkAdventure’s existing co-website mechanism.

## Minimal deployment adjustment points

Before server deployment, update URLs in `workspace-config/e2e-fix.json`:

- GitHub / ChatGPT wrapper URLs
- ttyd URLs
- Finder file service URL

Because this config is bundled at build time, changing those URLs requires rebuilding `workspace-app`.

## Recommended next-step design for new tasks

Do not handcraft new tasks directly in UI.

Instead:

1. create a new task JSON
2. let Codex prepare that JSON from:
   - issue / PR context
   - repo metadata
   - docker targets
3. review the JSON
4. apply it

See:

- `docs/workspace-bootstrap-skill.md`
