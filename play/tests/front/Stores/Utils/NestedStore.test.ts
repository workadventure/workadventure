import { describe, expect, it } from "vitest";
import { createNestedStore } from "@workadventure/store-utils";
import { get, writable } from "svelte/store";

describe("Nested store", () => {
    it("generates stores with getStoreByAccessor", () => {
        const rootStore = writable({
            foo: 12,
            store: writable("baz"),
        });

        const nestedStore = createNestedStore(rootStore, (root) => root.store);

        expect(get(nestedStore)).toBe("baz");

        rootStore.set({
            foo: 12,
            store: writable("init"),
        });

        expect(get(nestedStore)).toBe("init");

        get(rootStore).store.set("newVal");

        expect(get(nestedStore)).toBe("newVal");

        rootStore.set({
            foo: 42,
            store: writable("anotherVal"),
        });

        expect(get(nestedStore)).toBe("anotherVal");
    });
});
