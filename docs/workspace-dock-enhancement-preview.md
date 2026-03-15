# Workspace Dock Enhancement Preview

Date: 2026-03-14

## Backup saved

Current usable version was backed up to:

- `backups/workspace-app-dock-v1-20260314/`

That backup preserves the first working launcher version:

- text-button based bottom dock
- closed panels can be reopened from the dock

## Enhanced preview version

The live `workspace-app/` now previews 2 enhancements together:

### Enhancement A — icon Dock

Changes:

- bottom launcher is now more macOS-like
- each node is shown as an icon tile
- active / open / docked state is visible at a glance

### Enhancement B — minimize to Dock

Changes:

- each panel header now includes `Minimize`
- each tab header now includes a compact `−` minimize control
- minimizing sends the panel to the bottom dock
- clicking the dock icon restores or focuses the panel

## Preview URL

Open:

- `http://127.0.0.1:5174/?workspace=e2e-fix&resetLayout=1`

## What to try

1. click `Minimize` on `Codex Terminal`
2. confirm it disappears from the layout
3. confirm the bottom dock still shows `Codex Terminal` as `Docked`
4. click the `Codex Terminal` icon in the dock
5. confirm the panel comes back

## Validation done locally

Verified on 2026-03-14:

- workspace app builds successfully
- icon dock renders
- minimizing removes a panel from the layout
- dock state changes to `Docked`
- clicking the dock icon restores the panel
