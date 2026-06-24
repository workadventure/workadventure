# Error Handling

## Custom errors
```typescript
export class InvalidStatusTransitionError extends Error {
    constructor(msg: string) {
        super(msg);
        this.name = "InvalidStatusTransitionError";
    }
}
```

## Sentry integration
```typescript
import * as Sentry from "@sentry/node";

try {
    /* ... */
} catch (e) {
    console.error("An error happened:", e);
    Sentry.captureException(e);
}
```

## Exhaustive switch pattern
```typescript
switch (scope) {
    case Scope.WORLD:
        /* ... */
        break;
    case Scope.ROOM:
        /* ... */
        break;
    default: {
        const _exhaustiveCheck: never = scope;
    }
}
```
