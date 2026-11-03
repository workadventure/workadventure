import { describe, expect, it, vi } from "vitest";
import { getMediaShortcut, setMediaShortcut } from "./MediaShortcutStore";

describe("MediaShortcutStore", () => {
    it("swaps bindings when rebinding to a shortcut already used by the other action", () => {
        vi.stubGlobal("localStorage", { getItem: () => null, setItem: () => {} });
        const microphone = getMediaShortcut("microphone");
        const camera = getMediaShortcut("camera");

        setMediaShortcut("microphone", camera);

        expect(getMediaShortcut("microphone")).toEqual(camera);
        expect(getMediaShortcut("camera")).toEqual(microphone);
    });
});
