# Workspace Bootstrap Skill Design

Date: 2026-03-15

## Why this exists

The next pain point is not layout.

It is:

- creating a new task workspace quickly
- attaching the right docker/runtime targets
- scoping GitHub context to the task
- starting a fresh Codex session without losing the task handoff

## Core idea

For a new task:

- create a new Codex session
- let that Codex session **prepare a task manifest**
- do **not** let it execute changes directly

So the skill should produce:

1. `workspace-config/<task-id>.json`
2. `workspace-state/<task-id>/handoff.md`

## Strict boundary

The skill is a **planner**, not an applier.

It may:

- inspect GitHub via `gh`
- inspect repo metadata
- inspect docker status
- infer likely runtime/dependency needs
- output structured JSON

It must not:

- start services
- mutate docker
- install dependencies automatically
- change repo files outside the approved task outputs

## Inputs

The skill should accept:

- task brief
- optional issue id
- optional PR id
- optional repo path
- optional docker/worktree naming hint

## Data it may inspect

### GitHub

- `gh issue view`
- `gh pr view`
- `gh issue list --search`
- `gh pr list --search`

### Repo

- `package.json`
- `pnpm-lock.yaml`
- `requirements.txt`
- `pyproject.toml`
- `Dockerfile`
- `docker-compose.yml`
- `README*`

### Docker

- `docker ps`
- `docker inspect`

Prefer label-based discovery later:

- `wa.workspace=<task-id>`
- `wa.role=<role>`

## Output shape

Minimal manifest direction:

```json
{
  "taskId": "task-id",
  "title": "Task title",
  "source": {
    "repo": "org/repo",
    "issue": 123,
    "relatedPrs": [456]
  },
  "codex": {
    "sessionMode": "fresh",
    "handoffFile": "workspace-state/task-id/handoff.md"
  },
  "docker": {
    "targets": [
      {
        "name": "task-id-app",
        "label": "wa.workspace=task-id",
        "role": "app"
      }
    ]
  },
  "github": {
    "views": [
      {
        "id": "task-issue",
        "query": "repo:org/repo is:issue state:open number:123"
      }
    ]
  },
  "repoSetup": {
    "kind": "node",
    "install": "pnpm install",
    "run": "pnpm test"
  }
}
```

## Handoff file contents

`handoff.md` should be concise and portable:

- problem statement
- relevant issue / PR links
- runtime targets
- dependency/setup notes
- current decisions
- next 3 actions

Do not dump full chat history.

## Recommended workflow

1. human starts a new task
2. human opens a fresh Codex session
3. Codex runs this skill
4. Codex outputs manifest + handoff draft
5. human reviews
6. a separate small apply step wires the task into the workspace system

## Why separate planning from apply

This keeps the system:

- lower risk
- reviewable
- easier to diff
- easier to regenerate when context grows too large

## Suggested future skill name

`workspace-bootstrap`

## Suggested future prompt contract

- always search first
- keep output schema-valid
- do not execute environment changes
- if uncertain, leave fields blank and note uncertainty
