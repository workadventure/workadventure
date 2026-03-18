# Workspace App

Minimal web desktop for the `e2e-fix` saved workspace.

## What it is

- single-task workspace shell
- dock-only desktop UI
- floating app windows via Dockview
- local layout persistence in browser storage

## Current apps

- GitHub
- ChatGPT
- Codex Terminal
- Docker Ubuntu Terminal
- Review / Update
- Finder

## Local development

```bash
cd workspace-app
npm install
npm run dev
```

Open:

```text
http://127.0.0.1:5174/?workspace=e2e-fix
```

## Build

```bash
npm run build
```

## Finder file service

```bash
npm run files
```

Health check:

```text
http://127.0.0.1:4175/health
```

## Deployment

See:

- `docs/workspace-server-deploy.md`
- `docs/workspace-handoff-2026-03-15.md`
