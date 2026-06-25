# AGENTS.md - play/

Svelte/Phaser frontend, pusher server, and Room API server.

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
npm run build
```

Prefer checks over mutating commands during validation. Use `npm run lint-fix` and `npm run pretty` only when fixing files.

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
