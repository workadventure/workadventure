# TypeScript Style

## Import style
```typescript
import type { ServerDuplexStream } from "@grpc/grpc-js";
import type { CharacterTextureMessage } from "@workadventure/messages";

import { AvailabilityStatus } from "@workadventure/messages";

import { PlayerVariables } from "../Services/PlayersRepository/PlayerVariables";
```

## Naming conventions
| Element | Convention | Example |
|---------|------------|---------|
| Files (classes/components) | PascalCase | `User.ts`, `ErrorScreen.svelte` |
| Interfaces | `I` prefix | `ICommunicationStrategy.ts` |
| Test files | `.test.ts` suffix | `CommunicationManager.test.ts` |
| Variables/functions | camelCase | `roomsPromises`, `handleJoinRoom()` |
| Constants | SCREAMING_SNAKE | `GROUP_RADIUS`, `MINIMUM_DISTANCE` |
| Svelte stores | `Store` suffix | `GameStore.ts`, `ErrorScreenStore.ts` |

## Formatting (Prettier)
- Print width: 120 characters
- Tab width: 4 spaces
- EOL: newline at end of file

## ESLint key rules
- `@typescript-eslint/no-explicit-any`: no `any`
- `@typescript-eslint/consistent-type-imports`: require type imports
- `no-throw-literal`: throw `Error` objects only
- `no-await-in-loop`: avoid `await` in loops
- `rxjs/no-ignored-subscription`: handle RxJS subscriptions
- `svelte/require-each-key`: keys required in Svelte each blocks
