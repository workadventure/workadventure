import { get } from "svelte/store";
import { describe, expect, it } from "vitest";
import { createAudioInterruptedStore } from "./AudioInterruptedStore";

describe("AudioInterruptedStore", () => {
    it("tracks whether audio playback is interrupted", () => {
        const store = createAudioInterruptedStore();

        expect(get(store)).toBe(false);

        store.setInterrupted(true);
        expect(get(store)).toBe(true);

        store.setInterrupted(false);
        expect(get(store)).toBe(false);
    });
});
