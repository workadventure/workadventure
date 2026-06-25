# Testing (Vitest)

Vitest test locations vary by package: some are under `tests/`, while others are colocated under `src/`.

## Run a single test once

```bash
cd play && npm test -- --run tests/front/Utils/TokenBucket.test.ts
cd back && npm test -- --run tests/CommunicationManager.test.ts
cd map-storage && npm test -- --run src/Services/tests/LockByKey.test.ts
cd libs/map-editor && npm test -- tests/WAMSetting.test.ts
```

Test paths are relative to the selected package. `play`, `back`, and `map-storage` invoke `vitest` and may enter watch
mode in an interactive terminal unless `--run` is passed. Library test scripts generally already use `vitest run`.

## Watch mode

```bash
cd play
npm test -- tests/front/Utils/TokenBucket.test.ts
```

## Conventions

```typescript
import { beforeEach, describe, expect, it, vi } from "vitest";

describe("ClassName", () => {
  const createMockUser = (id: string): User => {
    /* ... */
  };

  describe("methodName", () => {
    it("should do X when Y", async () => {
      const user = createMockUser("1");

      const result = await manager.process(user);

      expect(result).toBe(true);
    });
  });
});
```

- Prefer behavior-focused assertions over implementation details.
- Use `vi.fn()` for mocks and `vi.useFakeTimers()` for deterministic time control.
- Restore mocks, timers, environment variables, and global state in `afterEach`.
- For bug fixes, add a regression test that fails for the original behavior.
- Do not weaken global timeouts to hide an unresolved race or missing readiness condition.
