import { describe, expect, it } from "vitest";
import { get } from "svelte/store";
import { visibilityStore } from "../../../src/front/Stores/VisibilityStore";

function setVisibilityState(state: DocumentVisibilityState): void {
    Object.defineProperty(document, "visibilityState", { configurable: true, get: () => state });
}

describe("visibilityStore", () => {
    it("reads the current visibility state when it gains a subscriber", () => {
        // The store attaches its listener on the first subscriber only, so a change happening while nobody
        // subscribes (between two game scenes, or before the game boots in a background tab) is never delivered.
        const unsubscribe = visibilityStore.subscribe(() => {});
        unsubscribe();

        setVisibilityState("hidden");
        expect(get(visibilityStore)).toBe(false);

        setVisibilityState("visible");
        expect(get(visibilityStore)).toBe(true);
    });
});
