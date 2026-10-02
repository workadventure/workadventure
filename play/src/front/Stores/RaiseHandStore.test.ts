import { get } from "svelte/store";
import { afterEach, describe, expect, it } from "vitest";
import { isHandRaisedStore, requestedHandRaiseState } from "./RaiseHandStore";

describe("RaiseHandStore", () => {
    afterEach(() => {
        // The store is a module-level singleton; reset it between tests.
        requestedHandRaiseState.lowerAll();
    });

    it("starts lowered everywhere", () => {
        expect(get(requestedHandRaiseState).size).toBe(0);
        expect(get(isHandRaisedStore)).toBe(false);
    });

    it("raises the hand in one space only", () => {
        requestedHandRaiseState.raise("bubble");

        expect([...get(requestedHandRaiseState)]).toEqual(["bubble"]);
        expect(get(isHandRaisedStore)).toBe(true);
    });

    it("lowers the hand in one space and keeps it in the others", () => {
        requestedHandRaiseState.raise("bubble");
        requestedHandRaiseState.raise("zone");
        requestedHandRaiseState.lower("bubble");

        expect([...get(requestedHandRaiseState)]).toEqual(["zone"]);
        expect(get(isHandRaisedStore)).toBe(true);
    });

    it("toggles the hand of a single space", () => {
        requestedHandRaiseState.toggle("bubble");
        expect(get(requestedHandRaiseState).has("bubble")).toBe(true);

        requestedHandRaiseState.toggle("bubble");
        expect(get(requestedHandRaiseState).has("bubble")).toBe(false);
        expect(get(isHandRaisedStore)).toBe(false);
    });

    it("lowers every hand at once", () => {
        requestedHandRaiseState.raise("bubble");
        requestedHandRaiseState.raise("zone");
        requestedHandRaiseState.lowerAll();

        expect(get(isHandRaisedStore)).toBe(false);
    });
});
