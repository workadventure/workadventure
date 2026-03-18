# Titan integration 01

Date: 2026-03-14

## What changed
- Connected from this Mac to `titan` over SSH
- Confirmed the target is the Ubuntu-on-WSL2 execution environment, not the raw Windows desktop shell
- Added a read-only state fetcher:
  - `scripts/fetch_titan_state.py`
- Added a one-command refresh helper:
  - `scripts/refresh_workspace_state.sh`
- Wrote live snapshot output to:
  - `maps/observer/state/titan-state.json`
- Regenerated the workspace map so the room now shows real machine data

## Current live facts pulled from titan
- host: `WIN-CSRB310NSN2`
- OS: `Ubuntu 24.04.4 LTS`
- kernel: `6.6.87.2-microsoft-standard-WSL2`
- visible child containers: 2
  - `kueue-pr9597-20260313-2154-dev-1`
  - `openclaw-openclaw-gateway-1`

## What you can see now
In the room, the labels are no longer purely fictional:
- Windows host name is real
- Ubuntu / WSL2 kernel label is real
- visible child container count is real
- child container names and statuses are real
- popup details also read from the fetched titan snapshot

## Next best follow-up
1. make the workspace prettier and less text-heavy
2. classify containers by role (issue sandbox / gateway / infra / repro)
3. add periodic refresh or manual in-world refresh affordance
