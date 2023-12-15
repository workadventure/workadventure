import { describe, expect, it } from "vitest";
import { MapStore } from "@workadventure/store-utils";
import type { Writable } from "svelte/store";
import { get, writable } from "svelte/store";

describe("Main store", () => {
    it("Set / delete / clear triggers main store updates", () => {
        const mapStore = new MapStore<string, string>();

        let triggered = false;

        const unsubscribe = mapStore.subscribe((map) => {
            triggered = true;
            expect(map).toBe(mapStore);
        });

        expect(triggered).toBe(true);
        triggered = false;
        expect(mapStore.has("foo")).toBe(false);
        mapStore.set("foo", "bar");
        expect(triggered).toBe(true);
        expect(mapStore.has("foo")).toBe(true);

        triggered = false;
        mapStore.delete("baz");
        expect(triggered).toBe(false);
        mapStore.delete("foo");
        expect(triggered).toBe(true);
        expect(mapStore.has("foo")).toBe(false);

        triggered = false;
        mapStore.clear();
        expect(triggered).toBe(true);
        unsubscribe();
    });

    it("generates stores for keys with getStore", () => {
        const mapStore = new MapStore<string, string>();

        let valueReceivedInStoreForFoo: string | undefined;
        let valueReceivedInStoreForBar: string | undefined;

        mapStore.set("foo", "someValue");

        const unsubscribe = mapStore.getStore("foo").subscribe((value) => {
            valueReceivedInStoreForFoo = value;
        });
        const unsubscribeBar = mapStore.getStore("bar").subscribe((value) => {
            valueReceivedInStoreForBar = value;
        });

        expect(valueReceivedInStoreForFoo).toBe("someValue");
        expect(valueReceivedInStoreForBar).toBe(undefined);
        mapStore.set("foo", "someOtherValue");
        expect(valueReceivedInStoreForFoo).toBe("someOtherValue");
        mapStore.delete("foo");
        expect(valueReceivedInStoreForFoo).toBe(undefined);
        mapStore.set("bar", "baz");
        expect(valueReceivedInStoreForBar).toBe("baz");
        mapStore.clear();
        expect(valueReceivedInStoreForBar).toBe(undefined);
        unsubscribeBar();
        mapStore.set("bar", "fiz");
        expect(valueReceivedInStoreForBar).toBe(undefined);
        unsubscribe();
    });

    it("generates stores with getStoreByAccessor", () => {
        const mapStore = new MapStore<
            string,
            {
                foo: string;
                store: Writable<string>;
            }
        >();

        const fooStore = mapStore.getNestedStore("foo", (value) => {
            return value.store;
        });

        mapStore.set("foo", {
            foo: "bar",
            store: writable("init"),
        });

        expect(get(fooStore)).toBe("init");

        mapStore.get("foo")?.store.set("newVal");

        expect(get(fooStore)).toBe("newVal");

        mapStore.set("foo", {
            foo: "bar",
            store: writable("anotherVal"),
        });

        expect(get(fooStore)).toBe("anotherVal");

        mapStore.delete("foo");

        expect(get(fooStore)).toBeUndefined();
    });

    it("can aggregate stores", () => {
        const mapStore = new MapStore<
            string,
            {
                store: Writable<number>;
            }
        >();

        mapStore.set("foo", {
            store: writable(12),
        });
        mapStore.set("bar", {
            store: writable(24),
        });

        const sumStore = mapStore.getAggregatedStore(
            (value) => value.store,
            (stores) => stores.reduce((partialSum, a) => partialSum + a, 0)
        );

        let value: number | undefined;

        const unsubscribe = sumStore.subscribe((val) => {
            value = val;
        });

        expect(get(sumStore)).toBe(36);

        mapStore.get("foo")?.store.set(24);

        expect(value).toBe(48);

        mapStore.set("baz", {
            store: writable(1),
        });

        expect(value).toBe(49);

        mapStore.set("baz", {
            store: writable(2),
        });

        expect(value).toBe(50);

        mapStore.delete("baz");

        expect(value).toBe(48);

        unsubscribe();
    });
});
