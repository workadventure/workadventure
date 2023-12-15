import { describe, expect, it } from "vitest";
import { ForwardableStore } from "@workadventure/store-utils";
import { writable } from "svelte/store";

describe("Forwardable store", () => {
    it("Forwards a store", () => {
        const forwardableStore = new ForwardableStore<string>("foo");

        let value = "";

        const unsubscribe = forwardableStore.subscribe((val) => {
            value = val;
        });

        expect(value).toBe("foo");

        const stringStore1 = writable("bar");
        forwardableStore.forward(stringStore1);

        expect(value).toBe("bar");
        stringStore1.set("baz");
        expect(value).toBe("baz");

        const stringStore2 = writable("bar");
        forwardableStore.forward(stringStore2);

        expect(value).toBe("bar");
        stringStore2.set("baz");
        expect(value).toBe("baz");

        unsubscribe();
    });
});
