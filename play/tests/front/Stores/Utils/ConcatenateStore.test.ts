import { get, writable } from "svelte/store";
import { describe, expect, it } from "vitest";
import { ConcatenateStore } from "@workadventure/store-utils";

describe("Concatenate Store", () => {
    it("Concatenates two stores", () => {
        const one = writable([1, 2]);
        const two = writable([3, 4]);

        const concatenated = new ConcatenateStore<number>();
        concatenated.addStore(one);
        concatenated.addStore(two);

        expect(get(concatenated)).toEqual([1, 2, 3, 4]);

        let value: number[] = [];

        const unsubscribe = concatenated.subscribe((val) => {
            value = val;
        });

        one.set([5, 6]);

        expect(value).toEqual([5, 6, 3, 4]);

        concatenated.removeStore(two);

        expect(value).toEqual([5, 6]);

        unsubscribe();
    });
});
