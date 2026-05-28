import { describe, expect, it } from "vitest";
import { readable, writable } from "svelte/store";
import { waitForStoreValue } from "../../../../src/front/Stores/Utils/waitForStoreValue";

describe("waitForStoreValue", () => {
    it("should resolve when the store already has a value", async () => {
        let unsubscribeCount = 0;
        const store = readable("ready", () => {
            return () => {
                unsubscribeCount++;
            };
        });

        await expect(waitForStoreValue(store)).resolves.toBe("ready");
        expect(unsubscribeCount).toBe(1);
    });

    it("should resolve when the store receives a value later", async () => {
        const store = writable<string | undefined>(undefined);
        const promise = waitForStoreValue(store);

        store.set("ready");

        await expect(promise).resolves.toBe("ready");
    });
});
