#!/usr/bin/env python3
from __future__ import annotations

import html
import json
import os
import pathlib
import re
import shlex
import subprocess
import urllib.error
import urllib.parse
import urllib.request
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

REMOTE_LABEL = os.environ.get("WORKSPACE_REMOTE_LABEL", "Titan")
SSH_TARGET = os.environ.get("WORKSPACE_REMOTE_SSH_TARGET", "microseyuyu@192.168.1.54")
REMOTE_TERMINAL_PATH = os.environ.get("WORKSPACE_REMOTE_TERMINAL_PATH", "/terminal/titan/")
REMOTE_REPO_PATH = os.environ.get("WORKSPACE_REMOTE_REPO_PATH", "/home/microseyuyu/work/ci_fix_ops")
PORT = int(os.environ.get("WORKSPACE_TASK_PORT", "4180"))
HOST = os.environ.get("WORKSPACE_TASK_HOST", "0.0.0.0")
MAX_FILE_BYTES = int(os.environ.get("WORKSPACE_TASK_MAX_FILE_BYTES", "200000"))
MAX_LOG_BYTES = int(os.environ.get("WORKSPACE_TASK_MAX_LOG_BYTES", "120000"))
WORKSPACE_ID = os.environ.get("WORKSPACE_ID", "e2e-fix")
WORKSPACE_BASE_URL = os.environ.get("WORKSPACE_BASE_URL", "http://127.0.0.1:5174")
ROOT_DIR = pathlib.Path(__file__).resolve().parent.parent
KINOPIO_CONTAINER_NAME = os.environ.get("KINOPIO_CONTAINER_NAME", "kinopio-server")

TASK_INIT_TEMPLATES = {
    "eslint-pr438-retro": {
        "taskId": "eslint-pr438-retrospective",
        "title": "PR #438 retrospective / follow-up",
        "kind": "pr-retrospective",
        "status": "intake",
        "repoUrl": "https://github.com/mskelton/eslint-plugin-playwright.git",
        "repoName": "mskelton/eslint-plugin-playwright",
        "checkoutRef": "main",
        "issueUrl": "https://github.com/mskelton/eslint-plugin-playwright/issues/159",
        "prUrl": "https://github.com/mskelton/eslint-plugin-playwright/pull/438",
        "commentUrl": "https://github.com/mskelton/eslint-plugin-playwright/pull/438#issuecomment-4063095731",
        "taskSummary": "Review what landed in PR #438, compare it with the latest maintainer feedback, and prepare a fresh follow-up contribution if needed.",
        "proxyMode": "smart",
        "statusFlow": [
            "intake",
            "understanding",
            "workspace-ready",
            "investigating",
            "implementing",
            "verifying",
            "ready-to-reply",
        ],
    }
}

TASK_NOTES = {
    "task-investigate": {
        "title": "Task Notes · Investigate",
        "spaceName": "Investigate Current Fix",
        "url": "http://kinopio.localhost:5174/investigate-current-fix-vQseEMSeafhTJW3vZJlkV",
        "nodeId": "notes",
    },
    "task-code": {
        "title": "Task Notes · Code Review",
        "spaceName": "Code Review Diff",
        "url": "http://kinopio.localhost:5174/code-review-diff-aB1cTc2oEsaHG-Ti9yoi4",
        "nodeId": "notes",
    },
    "task-runtime": {
        "title": "Task Notes · Runtime Watch",
        "spaceName": "Runtime Watch",
        "url": "http://kinopio.localhost:5174/runtime-watch-XAMHEvVoUpec-pU0btxvH",
        "nodeId": "notes",
    },
}

TASK_SKILLS = {
    "task-investigate": [
        {
            "id": "workspace-bootstrap",
            "mode": "planner",
            "docPath": "docs/workspace-bootstrap-skill.md",
            "summary": "Use when this task needs a fresh titan workspace plan instead of immediate mutation.",
        }
    ],
    "task-code": [
        {
            "id": "workspace-bootstrap",
            "mode": "planner",
            "docPath": "docs/workspace-bootstrap-skill.md",
            "summary": "Use when code-review findings imply a new or reset task workspace should be planned.",
        }
    ],
    "task-runtime": [
        {
            "id": "workspace-bootstrap",
            "mode": "planner",
            "docPath": "docs/workspace-bootstrap-skill.md",
            "summary": "Use when runtime work needs a reviewed titan workspace/runtime target plan.",
        }
    ],
}

TASK_ENTITIES = [
    {
        "id": "task-investigate",
        "title": "Investigate Current Fix",
        "station": "左侧电脑",
        "kind": "investigate",
        "prompt": "Enter current task workspace?",
        "description": "主任务 workspace：先看任务背景、GitHub 摘要、当前分支和改动范围。",
        "targetNodeId": "github",
        "workspaceTaskId": "task-investigate",
        "status": "active",
    },
    {
        "id": "task-code",
        "title": "Code Review / Diff",
        "station": "中间电脑",
        "kind": "review",
        "prompt": "Open code review workspace?",
        "description": "代码视角任务：聚焦变更文件、diff、相关代码路径和提交线索。",
        "targetNodeId": "finder",
        "workspaceTaskId": "task-code",
        "status": "ready",
    },
    {
        "id": "task-runtime",
        "title": "Runtime / Docker Watch",
        "station": "右侧电脑",
        "kind": "runtime",
        "prompt": "Open runtime watch workspace?",
        "description": "运行时任务：聚焦 titan ws docker 状态、日志、容器活动和最近变更。",
        "targetNodeId": "docker-ubuntu-terminal",
        "workspaceTaskId": "task-runtime",
        "status": "monitor",
    },
]


def slugify(value: str, fallback: str = "task") -> str:
    cleaned = re.sub(r"[^a-z0-9]+", "-", (value or "").strip().lower()).strip("-")
    return cleaned or fallback


def task_state_dir(task_id: str) -> pathlib.Path:
    path = ROOT_DIR / "workspace-state" / task_id
    path.mkdir(parents=True, exist_ok=True)
    return path


def task_init_record_path(task_id: str) -> pathlib.Path:
    return task_state_dir(task_id) / "init-record.json"


def runtime_host_payload() -> dict:
    return {
        "label": REMOTE_LABEL,
        "sshTarget": SSH_TARGET,
        "terminalPath": REMOTE_TERMINAL_PATH,
    }


def read_task_init_record(task_id: str) -> dict | None:
    path = task_init_record_path(task_id)
    if not path.exists():
        return None
    record = json.loads(path.read_text(encoding="utf-8"))
    titan = record.get("titan") or {}
    if (titan.get("install") or {}).get("statusPath") or (titan.get("install") or {}).get("logPath"):
        try:
            titan["install"] = refresh_titan_install(titan.get("install"))
            record["titan"] = titan
        except Exception as exc:  # noqa: BLE001
            install = titan.get("install") or {}
            install["statusError"] = str(exc)
            titan["install"] = install
            record["titan"] = titan
    if titan.get("repoPath"):
        try:
            existing_codex = record.get("codex") or {}
            record["codex"] = {**existing_codex, **(titan_codex_payload(task_id, titan) or {})}
        except Exception as exc:  # noqa: BLE001
            record["codex"] = {"available": False, "error": str(exc), "host": SSH_TARGET}
    if (record.get("codex") or {}).get("latestSessionId"):
        record["codexError"] = None
    record["runtimeHost"] = record.get("runtimeHost") or runtime_host_payload()
    record["sourceTrace"] = build_source_trace(
        record.get("source") or {},
        record.get("titan"),
        record.get("bootstrapPlan"),
        record.get("kinopio"),
        record.get("codex"),
    )
    return record


def write_task_init_record(task_id: str, payload: dict) -> pathlib.Path:
    path = task_init_record_path(task_id)
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    return path


def task_init_template(template_id: str) -> dict:
    payload = TASK_INIT_TEMPLATES.get(template_id)
    if not payload:
        raise KeyError(f"Unknown task init template: {template_id}")
    return json.loads(json.dumps(payload))


def http_json(url: str, headers: dict[str, str] | None = None) -> dict:
    request = urllib.request.Request(
        url,
        headers={
            "User-Agent": "workadventure-codex-task-init",
            "Accept": "application/vnd.github+json",
            **(headers or {}),
        },
    )
    try:
        with urllib.request.urlopen(request, timeout=20) as response:
            return json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as exc:  # noqa: PERF203
        detail = exc.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"GitHub API returned {exc.code}: {detail or exc.reason}") from exc
    except urllib.error.URLError as exc:
        raise RuntimeError(f"GitHub API request failed: {exc.reason}") from exc


def http_text(url: str, headers: dict[str, str] | None = None) -> str:
    request = urllib.request.Request(
        url,
        headers={
            "User-Agent": "workadventure-codex-task-init",
            "Accept": "text/html,application/xhtml+xml",
            **(headers or {}),
        },
    )
    with urllib.request.urlopen(request, timeout=20) as response:
        return response.read().decode("utf-8", errors="replace")


def guess_github_page_title(url: str, fallback: str) -> str:
    try:
        text = http_text(url)
    except Exception:  # noqa: BLE001
        return fallback
    match = re.search(r"<title>(.*?)</title>", text, flags=re.IGNORECASE | re.DOTALL)
    if not match:
        return fallback
    title = html.unescape(re.sub(r"\s+", " ", match.group(1))).strip()
    title = re.sub(r"\s*·\s*GitHub\s*$", "", title)
    title = re.sub(r"\s*by .*? · Pull Request #\d+ .*?$", "", title)
    title = re.sub(r"\s*#\d+ .*?$", "", title) if title.count(" · ") > 1 else title
    return title.strip() or fallback


def build_task_init_from_link(source_url: str) -> dict:
    raw = (source_url or "").strip()
    if not raw:
        raise ValueError("link is required")

    parsed = urllib.parse.urlparse(raw)
    if parsed.netloc not in {"github.com", "www.github.com"}:
        raise ValueError("Only github.com task links are supported right now")

    parts = [part for part in parsed.path.split("/") if part]
    if len(parts) < 4:
        raise ValueError("Unsupported GitHub link format")

    owner, repo, kind, number = parts[:4]
    if kind not in {"pull", "issues"}:
        raise ValueError("Only GitHub issue and pull request links are supported right now")
    if not number.isdigit():
        raise ValueError("GitHub link is missing a numeric issue / PR id")

    repo_name = f"{owner}/{repo}"
    repo_url = f"https://github.com/{repo_name}.git"
    checkout_ref = "main"
    source_kind = "pr" if kind == "pull" else "issue"
    comment_url = raw if parsed.fragment.startswith("issuecomment-") else None
    canonical_url = f"https://github.com/{repo_name}/{kind}/{number}"

    if source_kind == "pr":
        title = guess_github_page_title(canonical_url, f"{repo} PR #{number}")
        task_id = slugify(f"{repo}-pr-{number}", f"pr-{number}")
        task_summary = f"Understand PR #{number} ({title}) and prepare a ready-to-continue workspace."
        issue_url = None
        pr_url = canonical_url
    else:
        title = guess_github_page_title(canonical_url, f"{repo} issue #{number}")
        task_id = slugify(f"{repo}-issue-{number}", f"issue-{number}")
        task_summary = f"Understand issue #{number} ({title}) and prepare a ready-to-continue workspace."
        issue_url = canonical_url
        pr_url = None

    return {
        "taskId": task_id,
        "title": f"{repo} {source_kind.upper()} #{number} · {title}",
        "kind": f"github-{source_kind}",
        "status": "intake",
        "repoUrl": repo_url,
        "repoName": repo_name,
        "checkoutRef": checkout_ref,
        "issueUrl": issue_url,
        "prUrl": pr_url,
        "commentUrl": comment_url,
        "taskSummary": task_summary,
        "proxyMode": "smart",
        "statusFlow": [
            "intake",
            "understanding",
            "workspace-ready",
            "investigating",
            "implementing",
            "verifying",
            "ready-to-reply",
        ],
        "sourceLink": raw,
    }


def ssh_python(script: str) -> dict:
    proc = subprocess.run(
        [
            "ssh",
            "-o",
            "BatchMode=yes",
            "-o",
            "StrictHostKeyChecking=accept-new",
            "-o",
            "ConnectTimeout=10",
            SSH_TARGET,
            "python3",
            "-",
        ],
        input=script,
        capture_output=True,
        text=True,
    )
    if proc.returncode != 0:
        raise RuntimeError(proc.stderr.strip() or f"ssh failed with exit code {proc.returncode}")
    return json.loads(proc.stdout)


def shell_join(parts: list[str]) -> str:
    return " ".join(shlex.quote(str(part)) for part in parts)


def refresh_titan_install(install: dict | None) -> dict | None:
    payload = install or {}
    status_path = (payload.get("statusPath") or "").strip()
    log_path = (payload.get("logPath") or "").strip()
    if not status_path and not log_path:
        return payload or None

    script = f"""
import json, pathlib

status_path = pathlib.Path({json.dumps(status_path)})
log_path = pathlib.Path({json.dumps(log_path)})
payload = json.loads({json.dumps(json.dumps(payload, ensure_ascii=False))})

if status_path.exists():
    try:
        payload.update(json.loads(status_path.read_text(encoding="utf-8")))
        payload.pop("statusError", None)
    except Exception as exc:  # noqa: BLE001
        payload["statusError"] = str(exc)

if log_path.exists():
    data = log_path.read_bytes()
    tail_bytes = 20000
    payload["logTail"] = data[-tail_bytes:].decode("utf-8", errors="replace")
    payload["logTruncated"] = len(data) > tail_bytes
    payload["logSizeBytes"] = len(data)
else:
    payload.setdefault("logTail", "")
    payload.setdefault("logTruncated", False)

print(json.dumps(payload, ensure_ascii=False))
"""
    refreshed = ssh_python(script)
    refreshed.setdefault("label", "Dependency bootstrap")
    refreshed.setdefault("description", "Repository dependency install only; this is not deployment.")
    refreshed.setdefault("networkStrategy", "direct-first-fallback-proxy")
    refreshed.setdefault("networkTuning", {})
    refreshed.setdefault("attempts", [])
    return refreshed


def bootstrap_plan_summary_lines(plan: dict | None) -> list[str]:
    payload = plan or {}
    lines: list[str] = []
    stacks = payload.get("detectedStacks") or []
    required_tools = payload.get("requiredTools") or []
    available_tools = payload.get("availableTools") or []
    missing_tools = payload.get("missingTools") or []
    bootstrap_commands = payload.get("bootstrapCommands") or []
    evidence = payload.get("evidenceFiles") or []

    if payload.get("planPath"):
        lines.append(f"- Plan path: {payload['planPath']}")
    if stacks:
        lines.append(f"- Detected stacks: {', '.join(stacks)}")
    if evidence:
        lines.append(f"- Evidence: {', '.join(evidence[:8])}")
    if required_tools:
        lines.append(f"- Required tools: {', '.join(required_tools)}")
    if available_tools:
        lines.append(f"- Available tools: {', '.join(available_tools)}")
    if missing_tools:
        lines.append(f"- Missing tools: {', '.join(missing_tools)}")
    if bootstrap_commands:
        lines.append(f"- Bootstrap commands: {', '.join(bootstrap_commands[:4])}")
    if payload.get("blockedReason"):
        lines.append(f"- Blocked: {payload['blockedReason']}")
    if payload.get("recommendedNextAction"):
        lines.append(f"- Next: {payload['recommendedNextAction']}")
    return lines


def build_titan_agents_md(record: dict) -> str:
    source = record.get("source") or {}
    titan = record.get("titan") or {}
    kinopio = record.get("kinopio") or {}
    bootstrap_plan = record.get("bootstrapPlan") or {}
    summary = record.get("taskSummary") or record.get("title") or record.get("taskId") or f"Current {REMOTE_LABEL} task"
    bootstrap_lines = bootstrap_plan_summary_lines(bootstrap_plan) or ["- Plan not generated yet."]
    return "\n".join(
        [
            "# AGENTS.md",
            "",
            f"Use this file as a concise map for the current {REMOTE_LABEL} task workspace.",
            "",
            "## Task mission",
            summary,
            "",
            "## Source trace",
            f"- Repo: {source.get('repoUrl') or ''}",
            f"- Issue: {source.get('issueUrl') or ''}",
            f"- PR: {source.get('prUrl') or ''}",
            f"- Comment: {source.get('commentUrl') or ''}",
            f"- Kinopio: {kinopio.get('url') or ''}",
            "",
            "## Local task files",
            "- notes.md",
            "- out/task-overview.md",
            "- out/codex-init-prompt.md",
            "- out/bootstrap-plan.json",
            "- out/install-status.json",
            "- out/install.log",
            "",
            "## Bootstrap plan",
            *bootstrap_lines,
            "",
            "## Working style",
            "- Diagnose first, then align with the real issue / PR / comment.",
            "- Prefer the smallest useful change.",
            "- Keep source trace visible in your reasoning.",
            "- Read the local task files before proposing implementation.",
            "- Use $titan-task-init when resuming the standard task-init workflow.",
            "",
            "## Repo context",
            f"- {REMOTE_LABEL} workspace: {titan.get('workspacePath') or ''}",
            f"- Repo path: {titan.get('repoPath') or ''}",
            f"- Notes: {titan.get('notesPath') or ''}",
            f"- Task overview: {titan.get('overviewPath') or ''}",
        ]
    ).strip() + "\n"


def ensure_titan_agents_file(record: dict) -> str | None:
    titan = record.get("titan") or {}
    repo_path = (titan.get("repoPath") or "").strip()
    if not repo_path:
        return None
    agents_text = build_titan_agents_md(record)
    script = f"""
import json, pathlib

repo_path = pathlib.Path({json.dumps(repo_path)})
agents_path = repo_path / "AGENTS.md"
exclude_path = repo_path / ".git" / "info" / "exclude"
agents_text = {json.dumps(agents_text, ensure_ascii=False)}

agents_path.write_text(agents_text, encoding="utf-8")
exclude_path.parent.mkdir(parents=True, exist_ok=True)
existing = exclude_path.read_text(encoding="utf-8", errors="replace") if exclude_path.exists() else ""
needle = "/AGENTS.md"
if needle not in existing.splitlines():
    with exclude_path.open("a", encoding="utf-8") as fh:
        if existing and not existing.endswith("\\n"):
            fh.write("\\n")
        fh.write(needle + "\\n")

print(json.dumps(str(agents_path), ensure_ascii=False))
"""
    return ssh_python(script)


def titan_codex_payload(task_id: str, titan: dict) -> dict | None:
    repo_path = (titan.get("repoPath") or "").strip()
    workspace_path = (titan.get("workspacePath") or "").strip()
    if not repo_path:
        return None
    workspace_name = pathlib.Path(workspace_path).name if workspace_path else task_id

    script = f"""
import json, pathlib, shutil, sqlite3

repo_path = {json.dumps(repo_path)}
workspace_path = {json.dumps(workspace_path)}
home = pathlib.Path.home()
codex_candidates = []
which_codex = shutil.which("codex")
if which_codex:
    codex_candidates.append(which_codex)
fallback_codex = home / ".npm-global" / "bin" / "codex"
if fallback_codex.exists():
    codex_candidates.append(str(fallback_codex))
codex_bin = next((candidate for candidate in codex_candidates if candidate), None)
tmux_bin = shutil.which("tmux")

latest_session = None
session_error = None
db_path = home / ".codex" / "state_5.sqlite"
if db_path.exists():
    try:
        conn = sqlite3.connect(str(db_path))
        conn.row_factory = sqlite3.Row
        cur = conn.cursor()
        cur.execute(
            "SELECT id, cwd, title, updated_at FROM threads WHERE archived = 0 AND cwd IN (?, ?) ORDER BY updated_at DESC LIMIT 1",
            (repo_path, workspace_path),
        )
        row = cur.fetchone()
        if row:
            latest_session = dict(row)
        conn.close()
    except Exception as exc:  # noqa: BLE001
        session_error = str(exc)

print(
    json.dumps(
        {{
            "available": bool(codex_bin),
            "codexBin": codex_bin,
            "tmuxAvailable": bool(tmux_bin),
            "tmuxBin": tmux_bin,
            "latestSession": latest_session,
            "sessionError": session_error,
        }},
        ensure_ascii=False,
    )
)
"""
    remote = ssh_python(script)

    tmux_session = slugify(f"{task_id}-{workspace_name}", "task")
    codex_bin = remote.get("codexBin")
    latest_session = remote.get("latestSession") or {}
    session_id = latest_session.get("id")

    payload = {
        "host": SSH_TARGET,
        "cwd": repo_path,
        "workspacePath": workspace_path,
        "available": bool(remote.get("available")),
        "codexBin": codex_bin,
        "tmuxAvailable": bool(remote.get("tmuxAvailable")),
        "tmuxSessionName": tmux_session,
        "latestSessionId": session_id,
        "latestSession": latest_session or None,
        "sessionError": remote.get("sessionError"),
        "resumeAvailable": bool(session_id and codex_bin),
    }

    if not codex_bin:
        payload["message"] = "Codex CLI is not available on Titan yet."
        return payload

    direct_start = f"cd {shlex.quote(repo_path)} && {shlex.quote(codex_bin)}"
    payload["startCommand"] = shell_join(["ssh", "-t", SSH_TARGET, direct_start])

    if remote.get("tmuxAvailable"):
        payload["tmuxStartCommand"] = shell_join(
            [
                "ssh",
                "-t",
                SSH_TARGET,
                f"tmux new-session -A -s {shlex.quote(tmux_session)} -c {shlex.quote(repo_path)} {shlex.quote(codex_bin)}",
            ]
        )
        payload["tmuxAttachCommand"] = shell_join(
            ["ssh", "-t", SSH_TARGET, f"tmux attach -t {shlex.quote(tmux_session)}"]
        )

    if session_id:
        direct_resume = f"cd {shlex.quote(repo_path)} && {shlex.quote(codex_bin)} resume {shlex.quote(session_id)}"
        payload["resumeCommand"] = shell_join(["ssh", "-t", SSH_TARGET, direct_resume])
        if remote.get("tmuxAvailable"):
            payload["tmuxResumeCommand"] = shell_join(
                [
                    "ssh",
                    "-t",
                    SSH_TARGET,
                    f"tmux new-session -A -s {shlex.quote(tmux_session)} -c {shlex.quote(repo_path)} {shlex.quote(f'{codex_bin} resume {session_id}')}",
                ]
            )

    return payload


def codex_init_prompt(record: dict) -> str:
    source = record.get("source") or {}
    titan = record.get("titan") or {}
    kinopio = record.get("kinopio") or {}
    bootstrap_plan = record.get("bootstrapPlan") or {}
    title = record.get("title") or record.get("taskId") or "Task"
    summary = record.get("taskSummary") or title
    bootstrap_lines = bootstrap_plan_summary_lines(bootstrap_plan) or ["- Plan not generated yet."]
    return "\n".join(
        [
            f"# {title}",
            "",
            f"You are entering an already-prepared {REMOTE_LABEL} task workspace.",
            "",
            "## Mission",
            summary,
            "",
            "## First read these sources before changing anything",
            f"- Repo: {source.get('repoUrl') or ''}",
            f"- Issue: {source.get('issueUrl') or ''}",
            f"- PR: {source.get('prUrl') or ''}",
            f"- Comment: {source.get('commentUrl') or ''}",
            "",
            "## Local workspace context",
            f"- {REMOTE_LABEL} workspace: {titan.get('workspacePath') or ''}",
            f"- Repo path: {titan.get('repoPath') or ''}",
            f"- AGENTS.md: {titan.get('agentsPath') or ''}",
            f"- Notes: {titan.get('notesPath') or ''}",
            f"- Task overview: {titan.get('overviewPath') or ''}",
            f"- Bootstrap plan: {bootstrap_plan.get('planPath') or ''}",
            f"- Kinopio: {kinopio.get('url') or ''}",
            "",
            "## Bootstrap plan",
            *bootstrap_lines,
            "",
            "## Working style",
            "- Diagnose first, then align with existing docs / real context.",
            "- Prefer the smallest useful change.",
            "- Preserve traceability: keep linking back to issue / PR / comment / local files.",
            "- Do not jump to implementation before understanding the task chain.",
            "- Use $titan-task-init for the standard Titan task-init / resume workflow.",
            "",
            "## First actions",
            "1. Read the issue / PR / comment.",
            "2. Inspect the local repo state and task-overview.md.",
            "3. Summarize the current task in concrete terms.",
            "4. Only then propose the next minimal action.",
        ]
    ).strip()


def ensure_titan_codex_session(task_id: str, record: dict) -> dict | None:
    titan = record.get("titan") or {}
    existing = record.get("codex") or {}
    base = titan_codex_payload(task_id, titan)
    if not base or not base.get("available"):
        return base
    if base.get("latestSessionId") and existing.get("promptPath"):
        base["prompt"] = codex_init_prompt(record)
        base["promptPath"] = existing.get("promptPath")
        return base

    script = f"""
import json, pathlib, shlex, shutil, sqlite3, subprocess, time

task_slug = {json.dumps(base.get("tmuxSessionName") or slugify(task_id, "task"))}
repo_path = {json.dumps(titan.get("repoPath") or "")}
workspace_path = {json.dumps(titan.get("workspacePath") or "")}
prompt = {json.dumps(codex_init_prompt(record), ensure_ascii=False)}
home = pathlib.Path.home()
codex_bin = shutil.which("codex")
fallback = home / ".npm-global" / "bin" / "codex"
if not codex_bin and fallback.exists():
    codex_bin = str(fallback)
tmux_bin = shutil.which("tmux")
if not codex_bin:
    raise RuntimeError("Codex CLI is not available on Titan")
if not tmux_bin:
    raise RuntimeError("tmux is not available on Titan")

workspace = pathlib.Path(workspace_path)
out_dir = workspace / "out"
out_dir.mkdir(parents=True, exist_ok=True)
prompt_path = out_dir / "codex-init-prompt.md"
prompt_path.write_text(prompt + "\\n", encoding="utf-8")

session_name = task_slug
launch_command = f'PROMPT="$(cat {{shlex.quote(str(prompt_path))}})"; exec {{shlex.quote(codex_bin)}} --no-alt-screen "$PROMPT"'

has_session = subprocess.run([tmux_bin, "has-session", "-t", session_name], text=True, capture_output=True)
if has_session.returncode != 0:
    proc = subprocess.run(
        [tmux_bin, "new-session", "-d", "-s", session_name, "-c", repo_path, "bash", "-lc", launch_command],
        text=True,
        capture_output=True,
    )
    if proc.returncode != 0:
        raise RuntimeError(proc.stderr.strip() or proc.stdout.strip() or "failed to start tmux codex session")

session_id = None
for _ in range(10):
    capture = subprocess.run([tmux_bin, "capture-pane", "-pt", f"{{session_name}}:0"], text=True, capture_output=True, check=False)
    pane = capture.stdout or ""
    if "Press enter to continue" in pane:
        subprocess.run([tmux_bin, "send-keys", "-t", session_name, "Enter"], check=False)
        time.sleep(1)
    db_path = home / ".codex" / "state_5.sqlite"
    if db_path.exists():
        conn = sqlite3.connect(str(db_path))
        cur = conn.cursor()
        cur.execute(
            "SELECT id FROM threads WHERE archived = 0 AND cwd = ? ORDER BY updated_at DESC LIMIT 1",
            (repo_path,),
        )
        row = cur.fetchone()
        conn.close()
        if row:
            session_id = row[0]
            break
    time.sleep(1)

print(json.dumps({{"promptPath": str(prompt_path), "latestSessionId": session_id, "tmuxSessionName": session_name}}, ensure_ascii=False))
"""
    launched = ssh_python(script)
    refreshed = titan_codex_payload(task_id, titan) or {}
    refreshed["prompt"] = codex_init_prompt(record)
    refreshed["promptPath"] = launched.get("promptPath")
    if launched.get("latestSessionId"):
        refreshed["latestSessionId"] = launched.get("latestSessionId")
        refreshed["resumeAvailable"] = True
        codex_bin = refreshed.get("codexBin")
        repo_path = refreshed.get("cwd")
        if codex_bin and repo_path:
            direct_resume = f"cd {shlex.quote(repo_path)} && {shlex.quote(codex_bin)} resume {shlex.quote(launched['latestSessionId'])}"
            refreshed["resumeCommand"] = shell_join(["ssh", "-t", SSH_TARGET, direct_resume])
            if refreshed.get("tmuxAvailable"):
                tmux_resume_payload = f"{codex_bin} resume {launched['latestSessionId']}"
                refreshed["tmuxResumeCommand"] = shell_join(
                    [
                        "ssh",
                        "-t",
                        SSH_TARGET,
                        f"tmux new-session -A -s {shlex.quote(refreshed['tmuxSessionName'])} -c {shlex.quote(repo_path)} bash -lc {shlex.quote(tmux_resume_payload)}",
                    ]
                )
    return refreshed


def build_source_trace(
    payload: dict,
    titan: dict | None = None,
    bootstrap_plan: dict | None = None,
    kinopio: dict | None = None,
    codex: dict | None = None,
) -> list[dict]:
    trace: list[dict] = []

    def add(label: str, value: str | None, kind: str = "url") -> None:
        cleaned = (value or "").strip()
        if not cleaned:
            return
        trace.append({"label": label, "value": cleaned, "kind": kind})

    add("Source link", payload.get("sourceLink"))
    add("Repository", payload.get("repoUrl"))
    add("Issue", payload.get("issueUrl"))
    add("Pull Request", payload.get("prUrl"))
    add("Comment", payload.get("commentUrl"))
    if titan:
        add(f"{REMOTE_LABEL} workspace", titan.get("workspacePath"), "path")
        add(f"{REMOTE_LABEL} repo", titan.get("repoPath"), "path")
        add("Local AGENTS.md", titan.get("agentsPath"), "path")
        add(f"{REMOTE_LABEL} notes", titan.get("notesPath"), "path")
        add("Task overview", titan.get("overviewPath"), "path")
    if bootstrap_plan:
        add("Bootstrap plan", bootstrap_plan.get("planPath"), "path")
    if kinopio:
        add("Kinopio space", kinopio.get("url"))
    if codex:
        add("Codex prompt", codex.get("promptPath"), "path")
        add("Codex tmux session", codex.get("tmuxSessionName"), "text")
        add("Codex start", codex.get("tmuxStartCommand"), "command")
        add("Codex resume", codex.get("tmuxResumeCommand") or codex.get("resumeCommand"), "command")
    return trace


def build_kinopio_cards(space_name: str, task_summary: str | None = None, source_trace: list[dict] | None = None) -> list[dict]:
    cards = []
    if task_summary:
        cards.append(
            {
                "id": f"task-summary-{slugify(space_name)}",
                "x": 120,
                "y": 120,
                "z": 1,
                "width": 420,
                "height": 140,
                "name": f"{space_name}\n\n{task_summary}",
                "userId": None,
                "isCreatedThroughPublicApi": True,
            }
        )
    if source_trace:
        lines = [f"{item['label']}: {item['value']}" for item in source_trace]
        cards.append(
            {
                "id": f"task-trace-{slugify(space_name)}",
                "x": 620,
                "y": 120,
                "z": 1,
                "width": 540,
                "height": min(420, 100 + max(120, len(lines) * 26)),
                "name": "Source Trace\n\n" + "\n".join(lines),
                "userId": None,
                "isCreatedThroughPublicApi": True,
            }
        )
    return cards


def create_kinopio_space(
    space_name: str,
    task_summary: str | None = None,
    source_trace: list[dict] | None = None,
) -> dict:
    node_script = r"""
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const payload = JSON.parse(fs.readFileSync(0, 'utf8'));
const latestPath = '/data/kinopio/runtime/latest.json';
const spacesRoot = '/data/kinopio/backups/spaces';
const latest = JSON.parse(fs.readFileSync(latestPath, 'utf8'));
const user = latest.user;
const templateUser = latest.spaces?.[0]?.users?.[0] || user;
const now = payload.editedAt;

const token = (size = 15) => crypto.randomBytes(size).toString('base64url').slice(0, 21);
const slugify = (value) => String(value || '')
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '') || 'space';

const spaceId = token(15);
const collaboratorKey = token(15);
const readOnlyKey = token(15);
const space = {
  id: spaceId,
  name: payload.spaceName,
  privacy: 'private',
  showInExplore: false,
  collaboratorKey,
  users: [{ ...templateUser, lastSpaceId: spaceId }],
  collaborators: [],
  spectators: [],
  clients: [],
  background: 'https://bk.kinopio.club/squiggle-background-2x.png',
  backgroundGradient: null,
  backgroundIsGradient: false,
  isTemplate: false,
  cards: payload.cards || [],
  connections: [],
  connectionTypes: [],
  cacheDate: Date.now(),
  removedCards: [],
  originSpaceId: '1',
  tags: [],
  boxes: [],
  lines: [],
  lists: [],
  visits: 0,
  isRemoved: false,
  groupId: null,
  group: null,
  drawingStrokes: [],
  drawingImage: '',
  userId: user.id,
  proposedShowInExplore: false,
  showInExploreUpdatedAt: null,
  removedByUserId: null,
  readOnlyKey,
  previewImage: null,
  previewThumbnailImage: null,
  isRestrictedByModerator: false,
  addedToGroupByUserId: null,
  createdAt: now,
  editedAt: now,
  editedByUserId: user.id
};

latest.user.lastSpaceId = spaceId;
latest.savedAt = now;
latest.spaces = [...(latest.spaces || []), space];

fs.writeFileSync(path.join(spacesRoot, `${spaceId}.json`), JSON.stringify(space, null, 2) + '\n');
fs.writeFileSync(latestPath, JSON.stringify(latest, null, 2) + '\n');

process.stdout.write(JSON.stringify({
  ok: true,
  id: spaceId,
  name: payload.spaceName,
  slug: slugify(payload.spaceName),
  url: `http://kinopio.localhost:5174/${slugify(payload.spaceName)}-${spaceId}`
}));
"""

    edited_at = subprocess.check_output(["date", "-u", "+%Y-%m-%dT%H:%M:%SZ"], text=True).strip()
    cards = build_kinopio_cards(space_name, task_summary, source_trace)
    payload = {"spaceName": space_name, "editedAt": edited_at, "cards": cards}
    proc = subprocess.run(
        ["docker", "exec", "-i", KINOPIO_CONTAINER_NAME, "node", "-e", node_script],
        input=json.dumps(payload, ensure_ascii=False),
        capture_output=True,
        text=True,
        check=False,
    )
    if proc.returncode != 0:
        raise RuntimeError(proc.stderr.strip() or proc.stdout.strip() or f"kinopio create failed with {proc.returncode}")
    return json.loads(proc.stdout)


def remote_task_init(payload: dict) -> dict:
    script = f"""
import json, pathlib, re, subprocess, time

payload = json.loads({json.dumps(json.dumps(payload, ensure_ascii=False))})
home = pathlib.Path.home()
ws_cmd = home / "bin" / "ws"

def slugify(value, fallback="task"):
    cleaned = re.sub(r"[^a-z0-9]+", "-", str(value or "").strip().lower()).strip("-")
    return cleaned or fallback

def run(args, cwd=None, check=True):
    proc = subprocess.run(args, cwd=cwd, text=True, capture_output=True)
    if check and proc.returncode != 0:
        raise RuntimeError(proc.stderr.strip() or proc.stdout.strip() or f"command failed: {{args}}")
    return proc

def run_shell(command, cwd=None, check=True):
    proc = subprocess.run(["bash", "-lc", command], cwd=cwd, text=True, capture_output=True)
    if check and proc.returncode != 0:
        raise RuntimeError(proc.stderr.strip() or proc.stdout.strip() or f"shell failed: {{command}}")
    return proc

base_name = slugify(payload.get("workspaceName") or payload.get("taskId") or payload.get("title"), "task")
proxy_mode = payload.get("proxyMode") or "smart"

run([str(ws_cmd), "new", base_name, "--gui", "none", "--proxy", proxy_mode, "--up"])
current_file = home / ".local" / "share" / "ws" / "current"
workspace = pathlib.Path(current_file.read_text(encoding="utf-8").splitlines()[0].strip())
project_dir = workspace / "project"
repo_dir = project_dir / "repo"

clone_status = "existing"
if not repo_dir.exists():
    run(["git", "clone", payload["repoUrl"], "repo"], cwd=project_dir)
    clone_status = "cloned"

run(["git", "fetch", "--all", "--prune"], cwd=repo_dir, check=False)
checkout_ref = payload.get("checkoutRef") or "main"
checkout_proc = run(["git", "checkout", checkout_ref], cwd=repo_dir, check=False)
if checkout_proc.returncode != 0:
    remote_head = run(["git", "symbolic-ref", "refs/remotes/origin/HEAD"], cwd=repo_dir, check=False).stdout.strip()
    fallback_ref = remote_head.rsplit("/", 1)[-1] if remote_head else ""
    if fallback_ref and fallback_ref != checkout_ref:
        checkout_ref = fallback_ref
        run(["git", "checkout", checkout_ref], cwd=repo_dir)
    else:
        raise RuntimeError(checkout_proc.stderr.strip() or checkout_proc.stdout.strip() or f"git checkout failed for {{checkout_ref}}")
pull_proc = run(["git", "pull", "--ff-only", "origin", checkout_ref], cwd=repo_dir, check=False)

package_json = repo_dir / "package.json"
go_mod = repo_dir / "go.mod"
pyproject_toml = repo_dir / "pyproject.toml"
requirements_txt = repo_dir / "requirements.txt"
cargo_toml = repo_dir / "Cargo.toml"
makefile_path = repo_dir / "Makefile"
dockerfile_path = repo_dir / "Dockerfile"
install_command = None
install_prep_commands = []
network_tuning = {{}}
install_block_reason = None
detected_stack = "unknown"
detected_stacks = []
evidence_files = []
required_tools = []
available_tools = []
missing_tools = []

for candidate in [
    "package.json",
    "yarn.lock",
    "package-lock.json",
    ".yarnrc.yml",
    "go.mod",
    "pyproject.toml",
    "requirements.txt",
    "Cargo.toml",
    "Makefile",
    "Dockerfile",
    ".github/workflows",
]:
    if (repo_dir / candidate).exists():
        evidence_files.append(candidate)

tool_presence = {{}}
for tool_name in ["bash", "git", "node", "npm", "go", "python3", "pip", "uv", "cargo", "make", "docker"]:
    tool_presence[tool_name] = run([str(ws_cmd), "exec", "--", "bash", "-lc", f"command -v {{tool_name}} >/dev/null 2>&1"], check=False).returncode == 0
available_tools = [tool_name for tool_name, present in tool_presence.items() if present]

if package_json.exists():
    detected_stack = "node"
    detected_stacks.append("node")
    required_tools = ["node"]
    yarnrc = repo_dir / ".yarnrc.yml"
    yarn_path = None
    if yarnrc.exists():
        for line in yarnrc.read_text(encoding="utf-8", errors="replace").splitlines():
            if line.startswith("yarnPath:"):
                yarn_path = line.split(":", 1)[1].strip()
                break
    if yarn_path and (repo_dir / yarn_path).exists():
        required_tools.append("node")
        install_command = "cd /work/project/repo && node " + yarn_path + " install"
        install_prep_commands = [
            "cd /work/project/repo && node " + yarn_path + " config set -H networkConcurrency 8",
            "cd /work/project/repo && node " + yarn_path + " config set -H httpTimeout 240000",
        ]
        network_tuning = {{"yarnNetworkConcurrency": 8, "yarnHttpTimeoutMs": 240000}}
    elif (repo_dir / "package-lock.json").exists():
        required_tools.extend(["node", "npm"])
        install_command = "cd /work/project/repo && npm install"
elif go_mod.exists():
    detected_stack = "go"
    detected_stacks.append("go")
    required_tools = ["go"]
    if tool_presence.get("go"):
        install_command = "cd /work/project/repo && go mod download"
        network_tuning = {{"goProxy": "https://proxy.golang.org,direct"}}
    else:
        install_block_reason = "Go repo detected, but `go` is not installed in the current ws dev image."

if pyproject_toml.exists() or requirements_txt.exists():
    detected_stacks.append("python")
    required_tools.extend(["python3"])
if cargo_toml.exists():
    detected_stacks.append("rust")
    required_tools.extend(["cargo"])
if makefile_path.exists():
    required_tools.extend(["make"])
if dockerfile_path.exists():
    required_tools.extend(["docker"])

required_tools = list(dict.fromkeys(required_tools))
missing_tools = [tool_name for tool_name in required_tools if tool_name not in available_tools]

install = {{
    "ok": None,
    "command": install_command,
    "output": "",
    "truncated": False,
    "state": "skipped",
    "label": "Dependency bootstrap",
    "description": "Repository dependency install only; this is not deployment.",
    "networkStrategy": "direct-first-fallback-proxy",
    "networkTuning": network_tuning,
    "attempts": [],
}}
if install_command:
    install_log_path = workspace / "out" / "install.log"
    install_status_path = workspace / "out" / "install-status.json"
    started_at = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    install_status = {{
        "state": "running",
        "ok": None,
        "command": install_command,
        "label": "Dependency bootstrap",
        "description": "Repository dependency install only; this is not deployment.",
        "networkStrategy": "direct-first-fallback-proxy",
        "networkTuning": network_tuning,
        "networkMode": "direct",
        "attempts": [],
        "startedAt": started_at,
        "finishedAt": None,
        "exitCode": None,
        "logPath": str(install_log_path),
        "statusPath": str(install_status_path),
    }}
    install_status_path.write_text(json.dumps(install_status, ensure_ascii=False, indent=2) + "\\n", encoding="utf-8")
    install_log_path.write_text(f"[task-init] queued at {{started_at}}\\n", encoding="utf-8")
    install_runner = (
        "import json, pathlib, subprocess, time\\n\\n"
        + "ws_cmd = "
        + repr(str(ws_cmd))
        + "\\n"
        + "install_command = "
        + repr(install_command)
        + "\\n"
        + "prep_commands = "
        + repr(install_prep_commands)
        + "\\n"
        + "install_log_path = pathlib.Path("
        + repr(str(install_log_path))
        + ")\\n"
        + "install_status_path = pathlib.Path("
        + repr(str(install_status_path))
        + ")\\n"
        + "proxy_env_clear = ['env', '-u', 'http_proxy', '-u', 'https_proxy', '-u', 'all_proxy', '-u', 'HTTP_PROXY', '-u', 'HTTPS_PROXY', '-u', 'ALL_PROXY', '-u', 'NODE_USE_ENV_PROXY']\\n"
        + "status = json.loads(install_status_path.read_text(encoding='utf-8'))\\n\\n"
        + "def save_status():\\n"
        + "    install_status_path.write_text(json.dumps(status, ensure_ascii=False, indent=2) + '\\\\n', encoding='utf-8')\\n\\n"
        + "with install_log_path.open('a', encoding='utf-8') as log:\\n"
        + "    log.write('[task-init] starting dependency bootstrap\\\\n')\\n"
        + "    log.flush()\\n"
        + "    for prep_command in prep_commands:\\n"
        + "        log.write(f'[task-init] prep: {{prep_command}}\\\\n')\\n"
        + "        log.flush()\\n"
        + "        prep_proc = subprocess.run([ws_cmd, 'exec', '--', *proxy_env_clear, 'bash', '-lc', prep_command], text=True, stdout=log, stderr=subprocess.STDOUT)\\n"
        + "        if prep_proc.returncode != 0:\\n"
        + "            status['state'] = 'failed'\\n"
        + "            status['ok'] = False\\n"
        + "            status['exitCode'] = prep_proc.returncode\\n"
        + "            status['finishedAt'] = time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())\\n"
        + "            save_status()\\n"
        + "            raise SystemExit(prep_proc.returncode)\\n"
        + "    direct_started = time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())\\n"
        + "    log.write('[task-init] route=direct (proxy env cleared)\\\\n')\\n"
        + "    log.flush()\\n"
        + "    direct_proc = subprocess.run([ws_cmd, 'exec', '--', *proxy_env_clear, 'bash', '-lc', install_command], text=True, stdout=log, stderr=subprocess.STDOUT)\\n"
        + "    direct_finished = time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())\\n"
        + "    status['attempts'].append({{'route': 'direct', 'startedAt': direct_started, 'finishedAt': direct_finished, 'exitCode': direct_proc.returncode}})\\n"
        + "    proc = direct_proc\\n"
        + "    if direct_proc.returncode != 0:\\n"
        + "        status['networkMode'] = 'proxy'\\n"
        + "        save_status()\\n"
        + "        proxy_started = time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())\\n"
        + "        log.write('[task-init] direct route failed; retrying with workspace proxy env\\\\n')\\n"
        + "        log.flush()\\n"
        + "        proxy_proc = subprocess.run([ws_cmd, 'exec', '--', 'bash', '-lc', install_command], text=True, stdout=log, stderr=subprocess.STDOUT)\\n"
        + "        proxy_finished = time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())\\n"
        + "        status['attempts'].append({{'route': 'proxy', 'startedAt': proxy_started, 'finishedAt': proxy_finished, 'exitCode': proxy_proc.returncode}})\\n"
        + "        proc = proxy_proc\\n\\n"
        + "status['ok'] = proc.returncode == 0\\n"
        + "status['state'] = 'done' if proc.returncode == 0 else 'failed'\\n"
        + "status['exitCode'] = proc.returncode\\n"
        + "status['finishedAt'] = time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())\\n"
        + "status['networkMode'] = status['attempts'][-1]['route'] if status['attempts'] else status.get('networkMode')\\n"
        + "save_status()\\n"
    )
    runner_proc = subprocess.Popen(
        ["python3", "-c", install_runner],
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
        start_new_session=True,
    )
    install.update({{
        "state": "running",
        "statusPath": str(install_status_path),
        "logPath": str(install_log_path),
        "startedAt": started_at,
        "pid": runner_proc.pid,
        "output": "Dependency bootstrap started in background.",
    }})
else:
    install["ok"] = False
    install["state"] = "blocked" if install_block_reason else "skipped"
    install["output"] = install_block_reason or "No dependency bootstrap command detected."

bootstrap_plan_path = workspace / "out" / "bootstrap-plan.json"
recommended_next_action = ""
if install_command:
    recommended_next_action = "Wait for dependency bootstrap to finish, then open Codex and start understanding the task."
elif install_block_reason:
    recommended_next_action = install_block_reason + " Install the missing runtime in the ws image or switch to a workspace image that already has it."
else:
    recommended_next_action = "Open Codex, inspect the repo structure, and decide the first repo-specific setup command."

bootstrap_plan = {{
    "version": 1,
    "runtimeHost": {{"label": {json.dumps(REMOTE_LABEL)}, "sshTarget": {json.dumps(SSH_TARGET)}}},
    "workspaceName": workspace.name,
    "workspacePath": str(workspace),
    "repoPath": str(repo_dir),
    "planPath": str(bootstrap_plan_path),
    "detectedStacks": detected_stacks or ([detected_stack] if detected_stack != "unknown" else []),
    "primaryStack": detected_stack,
    "evidenceFiles": evidence_files,
    "requiredTools": required_tools,
    "availableTools": available_tools,
    "missingTools": missing_tools,
    "bootstrapCommands": install_prep_commands + ([install_command] if install_command else []),
    "networkStrategy": install.get("networkStrategy"),
    "networkTuning": network_tuning,
    "blockedReason": install_block_reason,
    "recommendedNextAction": recommended_next_action,
}}
bootstrap_plan_path.write_text(json.dumps(bootstrap_plan, ensure_ascii=False, indent=2) + "\\n", encoding="utf-8")

status = run(["git", "status", "-sb"], cwd=repo_dir, check=False).stdout.strip()
headline = run(["git", "log", "-1", "--pretty=%s"], cwd=repo_dir, check=False).stdout.strip()

notes_path = workspace / "notes.md"
overview_path = workspace / "out" / "task-overview.md"
notes_text = f'''# Battle Card
- Goal: {{payload.get("taskSummary") or payload.get("title")}}
- Scope: issue / PR / comment retrospective and possible follow-up contribution
- Risks: current maintainer expectation may differ from original PR shape
- Next: read issue + PR + comment, then inspect repo on {{checkout_ref}}

# Source Links
- Issue: {{payload.get("issueUrl") or ""}}
- PR: {{payload.get("prUrl") or ""}}
- Comment: {{payload.get("commentUrl") or ""}}

# Workspace
- Name: {{workspace.name}}
- Repo: {{repo_dir}}
- Branch: {{checkout_ref}}
- Clone: {{clone_status}}
- Install command: {{install_command or "n/a"}}
'''
notes_path.write_text(notes_text, encoding="utf-8")

overview_path.write_text(
    "\\n".join(
        [
            f"task_id: {{payload.get('taskId')}}",
            f"title: {{payload.get('title')}}",
            "status: workspace-ready",
            f"workspace: {{workspace}}",
            f"repo: {{repo_dir}}",
            f"branch: {{checkout_ref}}",
            f"headline: {{headline}}",
            f"issue_url: {{payload.get('issueUrl') or ''}}",
            f"pr_url: {{payload.get('prUrl') or ''}}",
            f"comment_url: {{payload.get('commentUrl') or ''}}",
        ]
    ) + "\\n",
    encoding="utf-8",
)

print(
    json.dumps(
        {{
            "workspaceName": workspace.name,
            "workspacePath": str(workspace),
            "repoPath": str(repo_dir),
            "branch": checkout_ref,
            "statusLine": status,
            "headline": headline,
            "cloneStatus": clone_status,
            "pullOutput": ((pull_proc.stdout or "") + (pull_proc.stderr or "")).strip(),
            "install": install,
            "bootstrapPlan": bootstrap_plan,
            "stack": detected_stack,
            "notesPath": str(notes_path),
            "overviewPath": str(overview_path),
            "bootstrapPlanPath": str(bootstrap_plan_path),
        }},
        ensure_ascii=False,
    )
)
"""
    return ssh_python(script)


def github_repo_metadata(owner: str, repo: str) -> dict | None:
    req = urllib.request.Request(
        f"https://api.github.com/repos/{owner}/{repo}",
        headers={
            "Accept": "application/vnd.github+json",
            "User-Agent": "workspace-task-service",
            "X-GitHub-Api-Version": "2022-11-28",
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            return json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as exc:
        return {"error": f"GitHub API returned {exc.code}"}
    except Exception as exc:  # noqa: BLE001
        return {"error": str(exc)}


def parse_github_remote(remote_url: str | None) -> dict | None:
    if not remote_url:
        return None

    cleaned = remote_url.removesuffix(".git")
    if cleaned.startswith("git@github.com:"):
        path = cleaned.split(":", 1)[1]
    elif cleaned.startswith("https://github.com/"):
        path = cleaned.split("https://github.com/", 1)[1]
    else:
        return None

    if "/" not in path:
        return None

    owner, repo = path.split("/", 1)
    return {
        "owner": owner,
        "repo": repo,
        "repoUrl": f"https://github.com/{owner}/{repo}",
        "issuesUrl": f"https://github.com/{owner}/{repo}/issues",
        "pullsUrl": f"https://github.com/{owner}/{repo}/pulls",
    }


def unique_file_entries(paths: list[str]) -> list[dict]:
    seen: set[str] = set()
    items: list[dict] = []
    for raw in paths:
        path_value = (raw or "").strip()
        if not path_value or path_value in seen:
            continue
        seen.add(path_value)
        items.append(
            {
                "path": path_value,
                "name": path_value.rsplit("/", 1)[-1],
                "directory": path_value.rsplit("/", 1)[0] if "/" in path_value else ".",
            }
        )
    return items


def build_compare_url(github: dict | None, branch: str | None, upstream_branch: str | None) -> str | None:
    if not github or not github.get("repoUrl") or not branch or not upstream_branch:
        return None
    compare_target = upstream_branch.split("/", 1)[-1]
    if not compare_target or compare_target == branch:
        return None
    return f"{github['repoUrl']}/compare/{compare_target}...{branch}"


def build_file_urls(github: dict | None, branch: str | None, paths: list[str]) -> list[dict]:
    if not github or not github.get("repoUrl") or not branch:
        return unique_file_entries(paths)
    items = unique_file_entries(paths)
    for item in items:
        item["blobUrl"] = f"{github['repoUrl']}/blob/{branch}/{item['path']}"
        item["historyUrl"] = f"{github['repoUrl']}/commits/{branch}/{item['path']}"
    return items


def remote_snapshot() -> dict:
    script = f"""
import json, subprocess, pathlib

repo = {REMOTE_REPO_PATH!r}

def run(args):
    return subprocess.run(args, cwd=repo, text=True, capture_output=True, check=True).stdout.strip()

def optional(args):
    proc = subprocess.run(args, cwd=repo, text=True, capture_output=True)
    return proc.stdout.strip() if proc.returncode == 0 else ""

def classify(index_status, worktree_status):
    if index_status == "?" and worktree_status == "?":
        return "untracked"
    if index_status == "A" or worktree_status == "A":
        return "added"
    if index_status == "D" or worktree_status == "D":
        return "deleted"
    if index_status == "R" or worktree_status == "R":
        return "renamed"
    if index_status == "M" or worktree_status == "M":
        return "modified"
    return "changed"

status_lines = optional(["git", "status", "--porcelain=v1"]).splitlines()
files = []
for raw in status_lines:
    if not raw:
        continue
    index_status, worktree_status = raw[0], raw[1]
    rest = raw[3:]
    original_path = None
    if " -> " in rest:
        original_path, rest = rest.split(" -> ", 1)
    files.append({{
        "path": rest,
        "indexStatus": index_status,
        "worktreeStatus": worktree_status,
        "change": classify(index_status, worktree_status),
        "originalPath": original_path,
    }})

commits = []
for row in optional(["git", "log", "--pretty=format:%H%x1f%h%x1f%s%x1f%an%x1f%aI", "-n", "5"]).splitlines():
    if not row:
        continue
    full_hash, short_hash, subject, author, authored_at = row.split("\\x1f")
    commits.append({{
        "hash": full_hash,
        "shortHash": short_hash,
        "subject": subject,
        "author": author,
        "authoredAt": authored_at,
    }})

payload = {{
    "repoPath": repo,
    "repoName": pathlib.Path(repo).name,
    "branch": optional(["git", "branch", "--show-current"]),
    "upstreamBranch": optional(["git", "rev-parse", "--abbrev-ref", "--symbolic-full-name", "@{{upstream}}"]),
    "originUrl": optional(["git", "remote", "get-url", "origin"]),
    "headline": optional(["git", "log", "-1", "--pretty=%s"]),
    "statusLine": optional(["git", "status", "-sb"]).splitlines()[0] if optional(["git", "status", "-sb"]) else "",
    "changedFiles": files,
    "changedFileCount": len(files),
    "commits": commits,
    "latestCommitFiles": [line for line in optional(["git", "show", "--pretty=format:", "--name-only", "HEAD"]).splitlines() if line],
}}
print(json.dumps(payload))
"""
    payload = ssh_python(script)
    github = parse_github_remote(payload.get("originUrl"))
    if github:
        payload["github"] = github
        payload["githubMeta"] = github_repo_metadata(github["owner"], github["repo"])
        payload["compareUrl"] = build_compare_url(github, payload.get("branch"), payload.get("upstreamBranch"))
        payload["latestCommitFiles"] = build_file_urls(github, payload.get("branch"), payload.get("latestCommitFiles", []))
        payload["changedFiles"] = [
            {
                **item,
                "blobUrl": f"{github['repoUrl']}/blob/{payload.get('branch')}/{item['path']}" if payload.get("branch") else None,
                "historyUrl": f"{github['repoUrl']}/commits/{payload.get('branch')}/{item['path']}" if payload.get("branch") else None,
            }
            for item in payload.get("changedFiles", [])
        ]
        for commit in payload.get("commits", []):
            commit["url"] = f"{github['repoUrl']}/commit/{commit['hash']}"
    else:
        payload["github"] = None
        payload["githubMeta"] = None
        payload["compareUrl"] = None
        payload["latestCommitFiles"] = unique_file_entries(payload.get("latestCommitFiles", []))
    return payload


def build_task_integrations(task_id: str, snapshot: dict, runtime: dict) -> dict:
    github = snapshot.get("github") or {}
    notes = TASK_NOTES.get(task_id, {})
    latest_commit_files = snapshot.get("latestCommitFiles") or []
    changed_files = snapshot.get("changedFiles") or []
    task_files = changed_files or latest_commit_files
    return {
        "notes": {
            "nodeId": notes.get("nodeId", "notes"),
            "title": notes.get("title"),
            "spaceName": notes.get("spaceName"),
            "url": notes.get("url"),
        },
        "github": {
            "nodeId": "github",
            "repoUrl": github.get("repoUrl"),
            "issuesUrl": github.get("issuesUrl"),
            "pullsUrl": github.get("pullsUrl"),
            "compareUrl": snapshot.get("compareUrl"),
            "branch": snapshot.get("branch"),
            "upstreamBranch": snapshot.get("upstreamBranch"),
        },
        "finder": {
            "nodeId": "finder",
            "preferredPaths": task_files,
            "source": "changed-files" if changed_files else "latest-commit",
            "emptyMessage": "No local changed files yet; falling back to files from HEAD." if not changed_files else None,
        },
        "titan": {
            "nodeId": "codex-terminal",
            "sshTarget": SSH_TARGET,
            "repoPath": snapshot.get("repoPath"),
            "workspaceName": runtime.get("currentWorkspaceName"),
            "workspacePath": runtime.get("currentWorkspacePath"),
            "defaultContainerName": runtime.get("defaultContainerName"),
        },
        "skills": TASK_SKILLS.get(task_id, []),
    }


def task_entities() -> dict:
    snapshot = remote_snapshot()
    runtime = remote_ws_runtime()
    workspace_id = WORKSPACE_ID
    entities = []
    for task in TASK_ENTITIES:
        entity = dict(task)
        entity["workspaceId"] = workspace_id
        entity["workspaceUrl"] = f"/?workspace={workspace_id}&task={task['workspaceTaskId']}"
        entity["summary"] = None
        entity["repoName"] = snapshot.get("repoName")
        entity["branch"] = snapshot.get("branch")
        entity["changedFileCount"] = snapshot.get("changedFileCount")
        entity.update(build_task_integrations(task["id"], snapshot, runtime))

        if task["id"] == "task-investigate":
            entity["headline"] = snapshot.get("headline")
            entity["statusLine"] = snapshot.get("statusLine")
            entity["summary"] = snapshot.get("headline") or snapshot.get("statusLine")
            entity["github"] = snapshot.get("github")
        elif task["id"] == "task-code":
            entity["headline"] = "Review changed files and diffs"
            entity["summary"] = f"{snapshot.get('changedFileCount', 0)} changed files ready for review"
        elif task["id"] == "task-runtime":
            entity["headline"] = "Watch titan runtime"
            entity["summary"] = "Monitor ws docker state, logs and runtime activity"

        entities.append(entity)

    return {
        "workspaceId": workspace_id,
        "currentTaskHeadline": snapshot.get("headline"),
        "repoName": snapshot.get("repoName"),
        "branch": snapshot.get("branch"),
        "github": snapshot.get("github"),
        "compareUrl": snapshot.get("compareUrl"),
        "titan": {
            "sshTarget": SSH_TARGET,
            "workspaceName": runtime.get("currentWorkspaceName"),
            "workspacePath": runtime.get("currentWorkspacePath"),
            "defaultContainerName": runtime.get("defaultContainerName"),
        },
        "tasks": entities,
    }


def task_context(task_id: str) -> dict:
    payload = task_entities()
    for task in payload.get("tasks", []):
        if task.get("id") == task_id:
            return {
                "workspaceId": payload.get("workspaceId"),
                "repoName": payload.get("repoName"),
                "branch": payload.get("branch"),
                "github": payload.get("github"),
                "compareUrl": payload.get("compareUrl"),
                "titan": payload.get("titan"),
                "task": task,
            }
    raise KeyError(f"Unknown task id: {task_id}")


def run_task_init(payload: dict) -> dict:
    task_id = (payload.get("taskId") or "").strip()
    title = (payload.get("title") or "").strip()
    repo_url = (payload.get("repoUrl") or "").strip()
    if not task_id:
        raise ValueError("taskId is required")
    if not title:
        raise ValueError("title is required")
    if not repo_url:
        raise ValueError("repoUrl is required")

    task_state_dir(task_id)
    titan = remote_task_init(payload)
    bootstrap_plan = titan.get("bootstrapPlan")
    source_for_init = {
        "sourceLink": payload.get("sourceLink"),
        "repoUrl": repo_url,
        "issueUrl": payload.get("issueUrl"),
        "prUrl": payload.get("prUrl"),
        "commentUrl": payload.get("commentUrl"),
    }

    agents_error = None
    try:
        titan["agentsPath"] = ensure_titan_agents_file(
            {
                "taskId": task_id,
                "title": title,
                "taskSummary": payload.get("taskSummary"),
                "source": source_for_init,
                "titan": titan,
                "bootstrapPlan": bootstrap_plan,
            }
        )
    except Exception as exc:  # noqa: BLE001
        agents_error = str(exc)

    kinopio_payload = None
    kinopio_error = None
    try:
        kinopio_payload = create_kinopio_space(
            f"{title} Notes",
            payload.get("taskSummary"),
            build_source_trace(source_for_init, titan, bootstrap_plan),
        )
    except Exception as exc:  # noqa: BLE001
        kinopio_error = str(exc)

    codex_payload = None
    codex_error = None
    try:
        record_seed = {
            "taskId": task_id,
            "title": title,
            "taskSummary": payload.get("taskSummary"),
            "source": source_for_init,
            "titan": titan,
            "bootstrapPlan": bootstrap_plan,
            "kinopio": kinopio_payload,
        }
        codex_payload = ensure_titan_codex_session(task_id, record_seed)
    except Exception as exc:  # noqa: BLE001
        codex_error = str(exc)

    record = {
        "taskId": task_id,
        "title": title,
        "kind": payload.get("kind") or "task",
        "status": "workspace-ready",
        "statusFlow": payload.get("statusFlow")
        or ["intake", "understanding", "workspace-ready", "investigating", "implementing", "verifying", "ready-to-reply"],
        "taskSummary": payload.get("taskSummary"),
        "source": source_for_init,
        "runtimeHost": runtime_host_payload(),
        "titan": titan,
        "bootstrapPlan": bootstrap_plan,
        "kinopio": kinopio_payload,
        "kinopioError": kinopio_error,
        "agentsError": agents_error,
        "codex": codex_payload,
        "codexError": codex_error,
        "workspaceAppUrl": f"{WORKSPACE_BASE_URL}/apps/task-init.html?task={urllib.parse.quote(task_id)}",
    }
    record["sourceTrace"] = build_source_trace(record["source"], titan, record.get("bootstrapPlan"), kinopio_payload, codex_payload)
    record_path = write_task_init_record(task_id, record)
    record["recordPath"] = str(record_path)
    return record


def remote_diff(path_value: str) -> dict:
    script = f"""
import json, subprocess, pathlib

repo = {REMOTE_REPO_PATH!r}
target = {path_value!r}
absolute = pathlib.Path(repo, target)

def maybe(args):
    proc = subprocess.run(args, cwd=repo, text=True, capture_output=True)
    return proc.stdout

staged = maybe(["git", "diff", "--cached", "--", target])
unstaged = maybe(["git", "diff", "--", target])
tracked = subprocess.run(["git", "ls-files", "--error-unmatch", target], cwd=repo, text=True, capture_output=True).returncode == 0

preview = ""
preview_error = None
if absolute.exists() and absolute.is_file():
    try:
        raw = absolute.read_bytes()
        if b"\\0" in raw:
            preview_error = "Binary file preview is not supported."
        else:
            preview = raw.decode("utf-8", errors="replace")
    except Exception as exc:
        preview_error = str(exc)

payload = {{
    "path": target,
    "tracked": tracked,
    "exists": absolute.exists(),
    "stagedDiff": staged,
    "unstagedDiff": unstaged,
    "preview": preview,
    "previewError": preview_error,
    "recentCommits": [],
}}

for row in maybe(["git", "log", "--pretty=format:%H%x1f%h%x1f%s%x1f%an%x1f%aI", "-n", "3", "--", target]).splitlines():
    if not row:
        continue
    full_hash, short_hash, subject, author, authored_at = row.split("\\x1f")
    payload["recentCommits"].append({{
        "hash": full_hash,
        "shortHash": short_hash,
        "subject": subject,
        "author": author,
        "authoredAt": authored_at,
    }})
print(json.dumps(payload))
"""
    payload = ssh_python(script)
    preview = payload.get("preview", "")
    if isinstance(preview, str) and len(preview.encode("utf-8")) > MAX_FILE_BYTES:
        payload["preview"] = preview.encode("utf-8")[:MAX_FILE_BYTES].decode("utf-8", errors="replace")
        payload["truncated"] = True
    else:
        payload["truncated"] = False
    snapshot = remote_snapshot()
    github = snapshot.get("github")
    branch = snapshot.get("branch")
    if github and branch:
        for commit in payload.get("recentCommits", []):
            commit["url"] = f"{github['repoUrl']}/commit/{commit['hash']}"
        payload["blobUrl"] = f"{github['repoUrl']}/blob/{branch}/{path_value}"
        payload["historyUrl"] = f"{github['repoUrl']}/commits/{branch}/{path_value}"
    return payload


def remote_ws_runtime() -> dict:
    script = """
import json, os, pathlib, subprocess

home = pathlib.Path.home()
current_file = home / ".local" / "share" / "ws" / "current"
proxy_keys = ["http_proxy", "https_proxy", "all_proxy", "no_proxy", "HTTP_PROXY", "HTTPS_PROXY", "ALL_PROXY", "NO_PROXY"]

def clean_env():
    env = os.environ.copy()
    for key in proxy_keys:
        env.pop(key, None)
    return env

def run(args, cwd=None):
    proc = subprocess.run(args, cwd=cwd, env=clean_env(), text=True, capture_output=True)
    return proc

payload = {
    "currentWorkspacePath": None,
    "currentWorkspaceName": None,
    "composeContainers": [],
    "workspaceContainers": [],
    "defaultContainerName": None,
    "meta": None,
    "notesPreview": None,
}

workspace = None
if current_file.exists():
    workspace = current_file.read_text(encoding="utf-8").splitlines()[0].strip()
    if workspace:
        payload["currentWorkspacePath"] = workspace
        payload["currentWorkspaceName"] = pathlib.Path(workspace).name

if workspace and pathlib.Path(workspace).is_dir():
    meta_file = pathlib.Path(workspace) / "ws.meta.json"
    if meta_file.exists():
        try:
            payload["meta"] = json.loads(meta_file.read_text(encoding="utf-8"))
        except Exception as exc:
            payload["metaError"] = str(exc)
    notes_file = pathlib.Path(workspace) / "notes.md"
    if notes_file.exists():
        try:
            payload["notesPreview"] = notes_file.read_text(encoding="utf-8", errors="replace")[:4000]
        except Exception as exc:
            payload["notesError"] = str(exc)

    compose_env = pathlib.Path(workspace) / ".ws" / "compose.env"
    compose_file = pathlib.Path(workspace) / "docker-compose.yml"
    if compose_env.exists() and compose_file.exists():
        proc = run(["docker", "compose", "--env-file", "./.ws/compose.env", "ps", "--format", "json"], cwd=workspace)
        if proc.returncode == 0:
            for raw in proc.stdout.splitlines():
                raw = raw.strip()
                if not raw:
                    continue
                payload["composeContainers"].append(json.loads(raw))
        else:
            payload["composeError"] = proc.stderr.strip() or proc.stdout.strip() or "docker compose ps failed"

workspace_name = payload["currentWorkspaceName"] or ""
if workspace_name:
    docker_ps = run([
        "docker", "ps", "-a",
        "--filter", f"label=com.docker.compose.project={workspace_name}",
        "--format", "{{json .}}",
    ])
    if docker_ps.returncode == 0:
        for raw in docker_ps.stdout.splitlines():
            raw = raw.strip()
            if not raw:
                continue
            payload["workspaceContainers"].append(json.loads(raw))

if payload["composeContainers"]:
    dev = next((item for item in payload["composeContainers"] if item.get("Service") == "dev"), payload["composeContainers"][0])
    payload["defaultContainerName"] = dev.get("Name") or dev.get("Names")
elif payload["workspaceContainers"]:
    payload["defaultContainerName"] = payload["workspaceContainers"][0].get("Names")

print(json.dumps(payload))
"""
    return ssh_python(script)


def remote_ws_logs(container_name: str, tail: int) -> dict:
    script = f"""
import json, subprocess

container_name = {container_name!r}
tail = {tail!r}

proc = subprocess.run(
    ["docker", "logs", "--tail", str(tail), container_name],
    text=True,
    capture_output=True,
)

output = ""
if proc.stdout:
    output += proc.stdout
if proc.stderr:
    output += proc.stderr

payload = {{
    "container": container_name,
    "tail": tail,
    "ok": proc.returncode == 0,
    "logs": output,
}}
if proc.returncode != 0:
    payload["error"] = output.strip() or f"docker logs failed with exit code {{proc.returncode}}"

print(json.dumps(payload))
"""
    payload = ssh_python(script)
    logs = payload.get("logs", "")
    if isinstance(logs, str) and len(logs.encode("utf-8")) > MAX_LOG_BYTES:
        payload["logs"] = logs.encode("utf-8")[-MAX_LOG_BYTES:].decode("utf-8", errors="replace")
        payload["truncated"] = True
    else:
        payload["truncated"] = False
    return payload


def remote_ws_activity(container_name: str) -> dict:
    script = f"""
import json, os, pathlib, subprocess, time

container_name = {container_name!r}
home = pathlib.Path.home()
current_file = home / ".local" / "share" / "ws" / "current"
workspace = current_file.read_text(encoding="utf-8").splitlines()[0].strip() if current_file.exists() else ""

payload = {{
    "container": container_name,
    "workspacePath": workspace or None,
    "stats": None,
    "top": [],
    "recentFiles": [],
}}

if workspace:
    ws_path = pathlib.Path(workspace)
    candidates = []
    for rel in ("project", "out"):
        root = ws_path / rel
        if root.exists():
            for path in root.rglob("*"):
                if not path.is_file():
                    continue
                try:
                    stat = path.stat()
                except OSError:
                    continue
                relative_path = str(path.relative_to(ws_path))
                if "/.git/" in ("/" + relative_path) or relative_path.startswith(".git/"):
                    continue
                candidates.append({{
                    "path": relative_path,
                    "mtime": stat.st_mtime,
                    "size": stat.st_size,
                }})
    candidates.sort(key=lambda item: item["mtime"], reverse=True)
    now = time.time()
    for item in candidates[:12]:
        item["ageSeconds"] = max(0, int(now - item["mtime"]))
        payload["recentFiles"].append(item)

stats_proc = subprocess.run(
    ["docker", "stats", "--no-stream", "--format", "{{{{json .}}}}", container_name],
    text=True,
    capture_output=True,
)
if stats_proc.returncode == 0 and stats_proc.stdout.strip():
    try:
        payload["stats"] = json.loads(stats_proc.stdout.strip().splitlines()[0])
    except Exception as exc:
        payload["statsError"] = str(exc)
elif stats_proc.returncode != 0:
    payload["statsError"] = stats_proc.stderr.strip() or "docker stats failed"

top_proc = subprocess.run(
    [
        "docker", "exec", container_name, "bash", "-lc",
        "ps -eo pid,etime,pcpu,pmem,comm,args --sort=-pcpu | head -n 12"
    ],
    text=True,
    capture_output=True,
)
if top_proc.returncode == 0:
    lines = [line.rstrip() for line in top_proc.stdout.splitlines() if line.strip()]
    payload["topRaw"] = lines
else:
    payload["topError"] = top_proc.stderr.strip() or "docker exec ps failed"

print(json.dumps(payload))
"""
    return ssh_python(script)


class Handler(BaseHTTPRequestHandler):
    def write_json(self, status: int, payload: dict) -> None:
        body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Cache-Control", "no-store")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self) -> None:  # noqa: N802
        parsed = urllib.parse.urlparse(self.path)
        query = urllib.parse.parse_qs(parsed.query)
        try:
            if parsed.path == "/health":
                self.write_json(
                    200,
                    {
                        "ok": True,
                        "remoteLabel": REMOTE_LABEL,
                        "remoteSshTarget": SSH_TARGET,
                        "remoteTerminalPath": REMOTE_TERMINAL_PATH,
                        "remoteRepoPath": REMOTE_REPO_PATH,
                    },
                )
                return
            if parsed.path == "/task/summary":
                snapshot = remote_snapshot()
                self.write_json(200, snapshot)
                return
            if parsed.path == "/tasks":
                self.write_json(200, task_entities())
                return
            if parsed.path == "/task/context":
                task_id = query.get("task", [""])[0].strip()
                if not task_id:
                    self.write_json(400, {"error": "Missing task query parameter"})
                    return
                self.write_json(200, task_context(task_id))
                return
            if parsed.path == "/task/init/template":
                template_id = query.get("template", [""])[0].strip()
                if not template_id:
                    self.write_json(400, {"error": "Missing template query parameter"})
                    return
                self.write_json(200, task_init_template(template_id))
                return
            if parsed.path == "/task/init/record":
                task_id = query.get("task", [""])[0].strip()
                if not task_id:
                    self.write_json(400, {"error": "Missing task query parameter"})
                    return
                record = read_task_init_record(task_id)
                if not record:
                    self.write_json(404, {"error": f"No task init record for {task_id}"})
                    return
                self.write_json(200, record)
                return
            if parsed.path == "/github/summary":
                snapshot = remote_snapshot()
                self.write_json(200, snapshot)
                return
            if parsed.path == "/git/status":
                snapshot = remote_snapshot()
                self.write_json(200, snapshot)
                return
            if parsed.path == "/git/diff":
                path_value = query.get("path", [""])[0]
                if not path_value:
                    self.write_json(400, {"error": "Missing path query parameter"})
                    return
                self.write_json(200, remote_diff(path_value))
                return
            if parsed.path == "/ws/runtime":
                self.write_json(200, remote_ws_runtime())
                return
            if parsed.path == "/ws/logs":
                container_name = query.get("container", [""])[0].strip()
                if not container_name:
                    runtime = remote_ws_runtime()
                    container_name = runtime.get("defaultContainerName") or ""
                if not container_name:
                    self.write_json(400, {"error": "No container selected and no default workspace container found"})
                    return
                tail = max(20, min(500, int(query.get("tail", ["160"])[0])))
                self.write_json(200, remote_ws_logs(container_name, tail))
                return
            if parsed.path == "/ws/activity":
                container_name = query.get("container", [""])[0].strip()
                if not container_name:
                    runtime = remote_ws_runtime()
                    container_name = runtime.get("defaultContainerName") or ""
                if not container_name:
                    self.write_json(400, {"error": "No container selected and no default workspace container found"})
                    return
                self.write_json(200, remote_ws_activity(container_name))
                return
            self.write_json(404, {"error": "Not found"})
        except Exception as exc:  # noqa: BLE001
            self.write_json(500, {"error": str(exc)})

    def do_POST(self) -> None:  # noqa: N802
        parsed = urllib.parse.urlparse(self.path)
        try:
            if parsed.path == "/task/init":
                length = int(self.headers.get("Content-Length", "0") or "0")
                body = self.rfile.read(length) if length > 0 else b"{}"
                payload = json.loads(body.decode("utf-8"))
                self.write_json(200, run_task_init(payload))
                return
            if parsed.path == "/task/init/from-link":
                length = int(self.headers.get("Content-Length", "0") or "0")
                body = self.rfile.read(length) if length > 0 else b"{}"
                payload = json.loads(body.decode("utf-8"))
                link = payload.get("link") or payload.get("url")
                init_payload = build_task_init_from_link(link)
                self.write_json(200, run_task_init(init_payload))
                return
            self.write_json(404, {"error": "Not found"})
        except Exception as exc:  # noqa: BLE001
            self.write_json(500, {"error": str(exc)})


if __name__ == "__main__":
    server = ThreadingHTTPServer((HOST, PORT), Handler)
    print(f"workspace task service listening on http://{HOST}:{PORT}")
    server.serve_forever()
