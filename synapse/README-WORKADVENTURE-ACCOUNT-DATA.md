# WorkAdventure `account_data` and Synapse

## What we patch

Matrix Synapse **always** returns `403 M_FORBIDDEN` for:

`GET /_matrix/client/v3/user/{userId}/account_data/{type}`

when `userId` is not the caller. This is **hard-coded** in `synapse/rest/client/account_data.py` — there is **no** `homeserver.yaml` switch.

For local development, `apply_workadventure_account_data_patch.py` runs from `start.sh` and relaxes the check **only** for account data types whose name starts with `fr.workadventure.` (for example `fr.workadventure.wa_display_name`, `fr.workadventure.wa_avatar`).

Any **authenticated** user on the same homeserver can then read those types for any other user on that server.

## Security

- Do **not** store secrets in `fr.workadventure.*` account data.
- For production, review whether you want this behaviour or a dedicated service; upgrading Synapse may require updating the patch script if the upstream file changes.

## Upstream changes

If `apply_workadventure_account_data_patch.py` logs *expected block not found* after a Synapse upgrade, compare your installed `synapse/rest/client/account_data.py` with the script’s `old` string and adjust the patch.
