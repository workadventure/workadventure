# AGENTS.md - play/

Svelte/Phaser frontend, pusher server, and Room API server. UI components are developed and tested in isolation with
Storybook (`npm run storybook`).

## Areas

- `src/front/`: browser application, Svelte UI, Phaser, media, and WebRTC.
- `src/pusher/`: WebSocket and HTTP server-facing logic.
- `src/room-api/`: Room API implementation.
- `src/i18n/`: source translations and generated types.
- `tests/`: Vitest tests; additional tests are colocated under `src/`.

## Common commands

```bash
cd play

npm run typecheck
npm run svelte-check
npm run lint
npm run pretty-check
npm test
npm run test:storybook
npm run build
```

Prefer checks over mutating commands during validation. Use `npm run lint-fix` and `npm run pretty` only when fixing files.

`npm test` runs the node/jsdom unit suite. `npm run test:storybook` runs the Storybook stories as browser tests (needs
Playwright's Chromium: `npx playwright install chromium`). See `../docs/agent/svelte.md` and `../docs/agent/testing-vitest.md`.

Run a focused unit test once:

```bash
cd play
npm test -- --run tests/front/Utils/TokenBucket.test.ts
```

## Generated prerequisites

After changing protobufs, generate messages from `messages/`. After changing translation keys, run:

```bash
cd play
npm run typesafe-i18n
npm run i18n:check
```

Do not edit generated `src/i18n/i18n-*.ts` files directly.

## Storybook stories

- **Scaffold** a story in one command: `npm run new-story -- src/front/Components/UI/MyComponent.svelte`
  (colocates the file, picks the title from the folder, drops in a `Default` story to fill in).
- **Required for the design system**: a CI gate (`.github/workflows/story-gate.yml`) fails a PR that adds
  a new `Components/UI/` or `Components/Input/` component without a colocated `*.stories.svelte`.
- **Colocate** the story with its component: `Button.stories.svelte` next to `Button.svelte`.
- **Title taxonomy** (the `title` in `defineMeta`) groups the sidebar:
  - `Design System/*` — the primitives in `Components/UI/` (Button, Badge, Chip, Avatar, Alert…).
  - `Forms/*` — the controls in `Components/Input/`.
  - `Feedback/*` — toasts, popups, modals, alerts shown over the app.
  - `Feature/*` — everything else worth documenting in isolation.
- Let `args` drive props; add `argTypes` controls and `tags: ["autodocs"]` for free interactive docs.
- Use the `play` function for interaction/assertions (`expect` from `storybook/test`), not a separate test file.
- **Store coupling** is the ceiling on what is worth story-ising. Method: write the story, read the
  import-time crash, mock that dependency, repeat. Helpers live in `.storybook/storyHelpers.ts`:
  - Prop-driven component → story directly (many components only _look_ store-coupled — the stores
    are read on interaction, not render, so a plain `args` fixture is enough).
  - Reads one writable store → `beforeEach: withStore(store.set, value, restore)`.
  - Reads several stores → `beforeEach: withStores([...])`.
  - Reads config (`window.env`) → already provided by `.storybook/preview-env.ts`.
  - Reads `gameManager` / Phaser game state → out of scope; extract a presentational view instead.

## Frontend conventions

- New and migrated Svelte components use Svelte 5 runes (`$props`, `$state`, `$derived`, `$effect`).
- Match the translation import style and UI patterns of neighboring components.
- Event listeners and subscriptions must have explicit cleanup. ESLint checks listener removal and ignored subscriptions.
- For Phaser or media behavior, test actual runtime state rather than relying only on rendered DOM state.

## Related guides

- `../docs/agent/testing-vitest.md`
- `../docs/agent/svelte.md`
- `../docs/agent/i18n.md`
- `../docs/agent/typescript-style.md`
- `../docs/agent/devtools.md`
