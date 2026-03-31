#!/usr/bin/env python3
"""
Patch Synapse's AccountDataServlet.on_GET so authenticated users can read *other* users'
global account_data only when the type is namespaced fr.workadventure.* (WA display name, WA avatar MXC).

Stock Synapse always returns 403 for user_id != requester. This is not configurable in homeserver.yaml.

Security: any logged-in user on this homeserver can read these types for any local user. Only use on trusted
WorkAdventure deployments; do not expose arbitrary private account_data.

Idempotent: safe to run on every container start.
"""
from __future__ import annotations

import sys
from pathlib import Path


def main() -> int:
    try:
        import synapse.rest.client.account_data as account_data_module
    except ImportError as e:
        print("apply_workadventure_account_data_patch: synapse not importable yet:", e, file=sys.stderr)
        return 0

    path = Path(account_data_module.__file__).resolve()
    text = path.read_text(encoding="utf-8")

    marker = "fr.workadventure."
    if marker in text and "WorkAdventure: allow any authenticated user" in text:
        print("apply_workadventure_account_data_patch: already applied", path)
        return 0

    old = """        if user_id != requester.user.to_string():
            raise AuthError(403, "Cannot get account data for other users.")

        # Push rules are stored in a separate table and must be queried separately."""
    new = """        if user_id != requester.user.to_string():
            # WorkAdventure: allow any authenticated user to read public WA types on this homeserver only.
            if not account_data_type.startswith("fr.workadventure."):
                raise AuthError(403, "Cannot get account data for other users.")

        # Push rules are stored in a separate table and must be queried separately."""

    if old not in text:
        print(
            "apply_workadventure_account_data_patch: expected block not found in",
            path,
            "- Synapse version may have changed; peer account_data reads will stay 403.",
            file=sys.stderr,
        )
        return 0

    path.write_text(text.replace(old, new, 1), encoding="utf-8")
    print("apply_workadventure_account_data_patch: patched", path)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
