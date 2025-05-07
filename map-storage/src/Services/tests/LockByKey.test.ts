import { describe, it, vi, expect } from "vitest";
import { LockByKey } from "../LockByKey";

describe("LockByKeys", () => {
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

        if (reject) reject();

        await secondPromise();

        expect(spy).toHaveBeenCalledOnce();
    });
});
