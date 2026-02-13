---
name: translate
description: Fill missing WorkAdventure i18n translations by running the i18n diff in play/ and updating locale files under play/src/i18n. Use when asked to run npm run i18n:diff, fix missing translation keys, or complete locale modules.
---

# Translate

## Workflow

1. Run the i18n diff to list missing keys.
   - Command: `cd play && npm run i18n:diff`
   - Single locale: `cd play && npm run i18n:diff -- <locale>`
2. If multiple locales are missing the same keys, prefer a single, scripted/batched edit across locale files to reduce context churn (e.g., a small node/sed script), then spot-check one locale.
3. Open the reported locale files under `play/src/i18n/<locale>/` only as needed to confirm structure.
4. For each missing key:
   - Look at the `en-US` translation first. If unsure, look at the `fr-FR` translation too.
   - If unsure, ask the user precisions before translating.
5. Re-run the diff command until it reports no missing translations.

## Conventions

- `en-US` is the source of truth. Use it to find the canonical string and structure.
- Preserve formatting, placeholders, and variable names exactly (e.g., `{name}`, `{count}`).
- Keep file formatting consistent with the existing module (4 spaces, newline at EOF).
