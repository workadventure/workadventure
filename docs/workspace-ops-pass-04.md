# Workspace ops pass 04

Date: 2026-03-14

## What changed
This pass pushed the workspace one step further toward a usable daily operations surface.

### 1. Map reads more like a real work area
The map generator now adds more small functional cues:
- Mac area reads as a control desk
- GitHub lane reads as a planning / dispatch strip
- Ubuntu parent area reads more like a traffic layer
- each child docker now has a clearer local role line
- status rail now carries a lightweight focus / next-action summary

### 2. Faster work entry points
The WorkAdventure action bar now exposes:
- Inspector
- Context Shell
- Titan Shell
- Work Board
- Current PR

So the user can jump directly to:
- the current runtime shell
- the broad parent shell
- the planning surface
- the most likely active PR

### 3. Inspector now has a work-focus card
The inspector now includes a `Work focus` section that tries to answer:
- what is the clearest visible active work item
- what should the user open first
- whether the next action should be PR-first or shell-first

## Why this helps
The goal is not just “see containers”.
The goal is to reduce the mental gap between:
- spatial zone
- actual running box
- actual work item
- actual next action

This pass tries to reduce that gap with direct operational shortcuts.
