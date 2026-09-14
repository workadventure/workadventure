import { describe, expect, it, vi } from "vitest";
import { get } from "svelte/store";
import { focusStore } from "../../../src/front/Stores/FocusStore";

function setVisibilityState(state: DocumentVisibilityState): void {
    Object.defineProperty(document, "visibilityState", { configurable: true, get: () => state });
    document.dispatchEvent(new Event("visibilitychange"));
}

describe("focusStore", () => {
    it("regains the focus when the page becomes visible again", () => {
        // Safari on iOS blurs the page when the user switches app, but fires no "focus" on the way back.
        const unsubscribe = focusStore.subscribe(() => {});

        setVisibilityState("hidden");
        window.dispatchEvent(new Event("blur"));
        expect(get(focusStore)).toBe(false);

        setVisibilityState("visible");
        expect(get(focusStore)).toBe(true);

        unsubscribe();
    });

    it("reads the current focus when it gains a subscriber", () => {
        // The listeners only exist while the store has subscribers: a change happening in between would
        // otherwise be handed over stale to the next subscriber.
        const unsubscribe = focusStore.subscribe(() => {});
        window.dispatchEvent(new Event("blur"));
        expect(get(focusStore)).toBe(false);
        unsubscribe();

        const hasFocus = vi.spyOn(document, "hasFocus").mockReturnValue(true);
        const unsubscribeAgain = focusStore.subscribe(() => {});
        expect(get(focusStore)).toBe(true);

        unsubscribeAgain();
        hasFocus.mockRestore();
    });
});
