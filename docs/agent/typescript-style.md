# TypeScript Style

## Ignoring TypeScript and ESLint rules

- Never use @ts-ignore or eslint-disable unless absolutely necessary. If you do so, ask the user first and comment why afterwards.
- Avoid `any` and type assertions (as).
- Always handle Promise rejections (no floating promises).

## AbortControllers

- Use `AbortController` for cancellable async operations (fetch, timers, streams, WebSocket).
- Accept `AbortSignal` as parameter in reusable async functions.
- Check `signal.aborted` before updating state after await.
- Catch `AbortError` separately and ignore it silently (not a real error).
- Use `AbortSignal.any([signal, AbortSignal.timeout(ms)])` for timeout + manual abort.

## Import style

Type-only imports and import ordering are enforced by ESLint.

```typescript
import type { ServerDuplexStream } from "@grpc/grpc-js";
import type { CharacterTextureMessage } from "@workadventure/messages";

import { AvailabilityStatus } from "@workadventure/messages";

import { PlayerVariables } from "../Services/PlayersRepository/PlayerVariables";
```

## Naming conventions

- Match the established convention in the surrounding module.
- Classes and Svelte components generally use PascalCase filenames.
- Utility modules may use camelCase filenames.
- Store filenames and exported store values generally use the `Store` suffix when they represent a Svelte store.

## Formatting (Prettier)

- Print width: 120 characters
- Tab width: 4 spaces
- EOL: newline at end of file

## ESLint key rules

- `@typescript-eslint/no-explicit-any`: no `any`
- `@typescript-eslint/consistent-type-imports`: require type imports
- `no-throw-literal`: throw `Error` objects only
- `rxjs/no-ignored-subscription`: handle RxJS subscriptions
- `svelte/require-each-key`: keys required in Svelte each blocks
