import { describe, it, vi, expect, afterEach } from "vitest";
import { LockByKey } from "../LockByKey";

describe("LockByKeys", () => {
    afterEach(() => {
        vi.useRealTimers();
    });

    it("should free the lock when promise is rejected", async () => {
        const lock = new LockByKey<string>();

        const key = "myKey";

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let reject: ((reason?: any) => void) | undefined;

        const spy = vi.fn();

        const firstPromise = new Promise((_, rej) => {
            reject = rej;
        });

        const secondPromise = () => {
            spy();
            return Promise.resolve();
        };

        lock.waitForLock(key, async () => {
            await firstPromise;
        }).catch(() => {});

        void lock.waitForLock(key, secondPromise);

        if (reject) reject(new Error("Test rejection"));

        await secondPromise();

        expect(spy).toHaveBeenCalledOnce();
    });

    it("should auto reject after timeout", async () => {
        vi.useFakeTimers();
        const lock = new LockByKey<string>();
        const key = "timeoutKey";

        const neverResolvingPromise = new Promise<void>(() => {});

        const waitPromise = lock.waitForLock(key, () => neverResolvingPromise, 10000);

        // Advance time past the timeout
        await vi.advanceTimersByTimeAsync(10_000);

        await expect(waitPromise).rejects.toThrow(/Lock timeout after 10000ms/);
    });

    it("should execute concurrent requests sequentially (not in parallel)", async () => {
        const lock = new LockByKey<string>();
        const key = "concurrentKey";
        const executionOrder: string[] = [];
        const concurrentExecutions: boolean[] = [];
        let currentlyExecuting = 0;

        const delay = (ms: number): Promise<void> =>
            new Promise((resolve) => {
                setTimeout(resolve, ms);
            });

        const createCallback = (id: string, delayMs: number) => {
            return async () => {
                currentlyExecuting++;
                // Track if multiple callbacks are executing at the same time
                concurrentExecutions.push(currentlyExecuting > 1);
                executionOrder.push(`start-${id}`);

                await delay(delayMs);

                executionOrder.push(`end-${id}`);
                currentlyExecuting--;
            };
        };

        // Fire 3 concurrent requests
        const promiseA = lock.waitForLock(key, createCallback("A", 10));
        const promiseB = lock.waitForLock(key, createCallback("B", 10));
        const promiseC = lock.waitForLock(key, createCallback("C", 10));

        // Wait for all to complete
        await Promise.all([promiseA, promiseB, promiseC]);

        // Verify sequential execution order: A finishes before B starts, B finishes before C starts
        expect(executionOrder).toEqual(["start-A", "end-A", "start-B", "end-B", "start-C", "end-C"]);

        // Verify no concurrent executions occurred
        expect(concurrentExecutions.every((concurrent) => !concurrent)).toBe(true);
    });

    it("should allow parallel execution for different keys", async () => {
        const lock = new LockByKey<string>();
        const executionOrder: string[] = [];

        const delay = (ms: number): Promise<void> =>
            new Promise((resolve) => {
                setTimeout(resolve, ms);
            });

        const createCallback = (id: string, delayMs: number) => {
            return async () => {
                executionOrder.push(`start-${id}`);
                await delay(delayMs);
                executionOrder.push(`end-${id}`);
            };
        };

        // Fire requests for different keys - should run in parallel
        const promiseA = lock.waitForLock("key1", createCallback("A", 20));
        const promiseB = lock.waitForLock("key2", createCallback("B", 10));

        await Promise.all([promiseA, promiseB]);

        // B should finish before A because they run in parallel and B is faster
        expect(executionOrder).toEqual(["start-A", "start-B", "end-B", "end-A"]);
    });

    it("should chain requests so B and C don't run in parallel when both arrive during A", async () => {
        // This test specifically reproduces the bug scenario:
        // - A is running
        // - B and C arrive while A is running
        // - With a buggy implementation, B and C would both await the same promiseA
        //   and then execute in parallel when A finishes
        // - With correct implementation, B chains after A, C chains after B

        const lock = new LockByKey<string>();
        const key = "chainKey";

        let resolveA: (() => void) | undefined;
        const blockingPromise = new Promise<void>((resolve) => {
            resolveA = resolve;
        });

        let resolveAStarted: (() => void) | undefined;
        const aStartedPromise = new Promise<void>((resolve) => {
            resolveAStarted = resolve;
        });

        const executionLog: string[] = [];
        let concurrentCount = 0;
        let maxConcurrent = 0;

        // Start A - it will block until we manually resolve it
        const lockA = lock.waitForLock(key, async () => {
            concurrentCount++;
            maxConcurrent = Math.max(maxConcurrent, concurrentCount);
            executionLog.push("A-start");
            resolveAStarted?.(); // Signal that A has started
            await blockingPromise;
            executionLog.push("A-end");
            concurrentCount--;
        });

        // Wait for A to actually start executing
        await aStartedPromise;

        // Now B and C arrive while A is still running
        // They should chain: A -> B -> C (not A -> [B, C] in parallel)
        const lockB = lock.waitForLock(key, async () => {
            concurrentCount++;
            maxConcurrent = Math.max(maxConcurrent, concurrentCount);
            executionLog.push("B-start");
            await Promise.resolve(); // minimal async work
            executionLog.push("B-end");
            concurrentCount--;
        });

        const lockC = lock.waitForLock(key, async () => {
            concurrentCount++;
            maxConcurrent = Math.max(maxConcurrent, concurrentCount);
            executionLog.push("C-start");
            await Promise.resolve(); // minimal async work
            executionLog.push("C-end");
            concurrentCount--;
        });

        // At this point, A is running, B and C are queued
        expect(executionLog).toEqual(["A-start"]);

        // Release A
        resolveA?.();

        // Wait for all to complete
        await Promise.all([lockA, lockB, lockC]);

        // Verify strict sequential execution
        expect(executionLog).toEqual(["A-start", "A-end", "B-start", "B-end", "C-start", "C-end"]);

        // Verify no concurrent executions (max should be 1)
        expect(maxConcurrent).toBe(1);
    });
});
