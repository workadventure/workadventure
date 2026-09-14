import { describe, expect, it } from "vitest";
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
});
