# Error Handling

## Custom errors

Use a custom error when callers need to distinguish a domain failure. A custom constructor is unnecessary when the
default `Error` behavior is sufficient.

```typescript
export class InvalidStatusTransitionError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = new.target.name;
  }
}
```

## Catching unknown values

In TypeScript, catch bindings are typed as unknown (since any value can be thrown). To safely read the error message or other properties:

Use the catch-unknown library: import asError from "catch-unknown" and call asError(err).message (or .name, .stack) instead of manual checks.
Avoid: err instanceof Error ? err.message : String(err) — use asError(err).message instead for consistent, type-safe handling of thrown primitives or non-Error objects.
Example:

```ts
import { asError } from "catch-unknown";

try {
  // ...
} catch (e: unknown) {
  const error = asError(e);
  // error is an Error instance now.
}
```

When wrapping an error, preserve it with `cause`:

```typescript
throw new InvalidStatusTransitionError("Could not change status", {
  cause: asError(error),
});
```

## Logging and Sentry

- Expected validation, authorization, not-found, and user-input failures should normally be returned through the
  appropriate domain or transport result without Sentry noise.
- Unexpected programming, dependency, or infrastructure failures should include useful operation context and should be
  reported to Sentry (and the logs).
- Avoid reporting stringified errors when the original `Error` is available; preserving the object keeps its stack and
  cause chain.

```typescript
try {
  /* ... */
} catch (error: unknown) {
  const cause = asError(error);
  console.error("Failed to update room state", cause);
  Sentry.captureException(cause);
}
```

## Exhaustive switch pattern

```typescript
switch (scope) {
  case Scope.WORLD:
    return handleWorld();
  case Scope.ROOM:
    return handleRoom();
  default: {
    const _exhaustiveCheck: never = scope;
    throw new Error(`Unhandled scope: ${String(_exhaustiveCheck)}`);
  }
}
```

At HTTP and gRPC boundaries, convert known domain errors to transport-specific responses. Do not leak raw internal
errors or stack traces to clients.
