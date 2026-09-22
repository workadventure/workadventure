import { get } from "svelte/store";
import { afterEach, describe, expect, it } from "vitest";
import { requestedHandRaiseState } from "./RaiseHandStore";

describe("RaiseHandStore", () => {
    afterEach(() => {
        // The store is a module-level singleton; reset it between tests.
        requestedHandRaiseState.lowerHand();
    });

    it("starts lowered", () => {
        expect(get(requestedHandRaiseState).raised).toBe(false);
        expect(get(requestedHandRaiseState).raisedAt).toBe(0);
    });

    it("raises the hand with a timestamp", () => {
        requestedHandRaiseState.raiseHand();

        const state = get(requestedHandRaiseState);
        expect(state.raised).toBe(true);
        expect(state.raisedAt).toBeGreaterThan(0);
    });

    it("lowers the hand and clears the timestamp", () => {
        requestedHandRaiseState.raiseHand();
        requestedHandRaiseState.lowerHand();

        const state = get(requestedHandRaiseState);
        expect(state.raised).toBe(false);
        expect(state.raisedAt).toBe(0);
    });

    it("toggles between raised and lowered", () => {
        expect(get(requestedHandRaiseState).raised).toBe(false);

        requestedHandRaiseState.toggle();
        expect(get(requestedHandRaiseState).raised).toBe(true);
        expect(get(requestedHandRaiseState).raisedAt).toBeGreaterThan(0);

        requestedHandRaiseState.toggle();
        expect(get(requestedHandRaiseState).raised).toBe(false);
        expect(get(requestedHandRaiseState).raisedAt).toBe(0);
    });
});
