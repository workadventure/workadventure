import { afterEach, describe, expect, it, vi } from "vitest";
import { preventTabFreezing } from "../../../src/front/Utils/TabFreezing";

describe("preventTabFreezing", () => {
    afterEach(() => {
        Reflect.deleteProperty(navigator, "locks");
    });

    it("holds a Web Lock of its own for as long as the page lives", async () => {
        let lockCallbackResult: Promise<unknown> | undefined;
        const request = vi.fn((_name: string, callback: () => Promise<unknown>) => {
            lockCallbackResult = callback();
            return lockCallbackResult;
        });
        Object.defineProperty(navigator, "locks", { configurable: true, value: { request } });

        preventTabFreezing("tab-1");

        expect(request).toHaveBeenCalledWith("workadventure-prevent-tab-freezing-tab-1", expect.any(Function));
        // The lock is released as soon as the promise returned by the callback settles.
        const settled = await Promise.race([
            lockCallbackResult?.then(
                () => true,
                () => true,
            ),
            new Promise((resolve) => {
                setTimeout(() => resolve(false), 50);
            }),
        ]);
        expect(settled).toBe(false);
    });

    it("does nothing where Web Locks are not available", () => {
        expect("locks" in navigator).toBe(false);
        expect(() => preventTabFreezing("tab-1")).not.toThrow();
    });
});
