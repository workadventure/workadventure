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

    it("rejects shortcuts reserved by fixed bindings", () => {
        vi.stubGlobal("localStorage", { getItem: () => null, setItem: () => {} });
        const microphone = getMediaShortcut("microphone");

        expect(setMediaShortcut("microphone", { ...microphone, key: "KeyC" })).toBe(false);
        expect(getMediaShortcut("microphone")).toEqual(microphone);
    });
});
