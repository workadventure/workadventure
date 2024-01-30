import { get, writable } from "svelte/store";
import { describe, expect, it } from "vitest";
import { ConcatenateMapStore } from "@workadventure/store-utils";

describe("Concatenate Map Store", () => {
    it("Concatenates two stores", () => {
        const firstMap = new Map<string, number>();
        firstMap.set("one", 1);
        firstMap.set("two", 2);

        const secondMap = new Map<string, number>();
        secondMap.set("three", 3);
        secondMap.set("four", 4);

        const one = writable(new Map<string, number>(firstMap));
        const two = writable(new Map<string, number>(secondMap));

        const concatenated = new ConcatenateMapStore<string, number>();
        concatenated.addStore(one);
        concatenated.addStore(two);

        expect(Array.from(get(concatenated).values())).toEqual([1, 2, 3, 4]);

        let value: Map<string, number> = new Map();

        const unsubscribe = concatenated.subscribe((val) => {
            value = val;
        });

        one.set(new Map<string, number>([["five", 5]]));

        expect(Array.from(value.values())).toEqual([5, 3, 4]);

        concatenated.removeStore(two);

        expect(Array.from(value.values())).toEqual([5]);

        unsubscribe();
    });
});
