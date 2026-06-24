# Testing (Vitest)

## Running a single unit test
```bash
cd play && npm test -- path/to/test.ts
cd back && npm test -- tests/CommunicationManager.test.ts
cd libs/map-editor && npm test -- tests/MapValidator.test.ts
```

## Watch mode
```bash
npm test -- --watch tests/YourTest.test.ts
```

## Conventions
```typescript
import { describe, expect, it, vi, beforeEach } from "vitest";

describe("ClassName", () => {
    const createMockUser = (id: string): User => { /* ... */ };

    describe("methodName", () => {
        it("should do X when Y", async () => {
            const user = createMockUser("1");       // Arrange
            const result = await manager.process(user); // Act
            expect(result).toBe(true);              // Assert
        });
    });
});
```

Use `vi.fn()` for mocks and `vi.useFakeTimers()` for time control.
