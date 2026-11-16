import { beforeEach, describe, expect, it } from "vitest";
import { get } from "svelte/store";
import {
    bindingFromEvent,
    findShortcutAction,
    fixedShortcutFor,
    isBrowserReserved,
    shortcutOverridesStore,
    shortcutsStore,
} from "./ShortcutsStore";

const keyDown = (code: string, key: string, init: KeyboardEventInit = {}) =>
    new KeyboardEvent("keydown", { code, key, ...init });

describe("ShortcutsStore", () => {
    beforeEach(() => {
        shortcutOverridesStore.resetAll();
    });

    it("matches the default shortcuts, modifiers included", () => {
        expect(findShortcutAction(keyDown("KeyC", "c"))).toBe("openChat");
        expect(findShortcutAction(keyDown("KeyD", "d", { ctrlKey: true }))).toBe("walkMyDesk");
        expect(findShortcutAction(keyDown("KeyD", "d", { metaKey: true }))).toBe("walkMyDesk");
        expect(findShortcutAction(keyDown("KeyD", "d"))).toBeUndefined();
        expect(findShortcutAction(keyDown("KeyC", "c", { ctrlKey: true }))).toBeUndefined();
    });

    it("moves a key from one action to another and saves it", () => {
        const binding = bindingFromEvent(keyDown("KeyF", "f"));
        expect(binding).not.toBeNull();
        if (!binding) return;
        shortcutOverridesStore.assign("rotatePlayer", binding, "follow");

        expect(findShortcutAction(keyDown("KeyF", "f"))).toBe("rotatePlayer");
        expect(findShortcutAction(keyDown("KeyR", "r"))).toBeUndefined();
        expect(get(shortcutsStore).follow).toBeNull();
        expect(JSON.parse(localStorage.getItem("keyboardShortcuts") ?? "{}")).toMatchObject({ follow: null });

        shortcutOverridesStore.reset("rotatePlayer");
        expect(findShortcutAction(keyDown("KeyR", "r"))).toBe("rotatePlayer");
    });

    it("ignores lone modifiers and labels keys by what they print", () => {
        expect(bindingFromEvent(keyDown("ShiftLeft", "Shift", { shiftKey: true }))).toBeNull();
        // AZERTY: the physical KeyQ prints "a".
        expect(bindingFromEvent(keyDown("KeyQ", "a"))).toMatchObject({ code: "KeyQ", label: "A" });
        // macOS ⌥T prints "†": fall back to the physical key.
        expect(bindingFromEvent(keyDown("KeyT", "†", { altKey: true }))).toMatchObject({ label: "T", alt: true });
    });

    it("flags fixed and browser-reserved keys", () => {
        const binding = (code: string, key: string, init: KeyboardEventInit = {}) => {
            const result = bindingFromEvent(keyDown(code, key, init));
            if (!result) throw new Error("no binding");
            return result;
        };
        expect(fixedShortcutFor(binding("KeyW", "z"))).toBe("walk");
        expect(fixedShortcutFor(binding("Digit3", "3"))).toBe("sendEmote");
        expect(fixedShortcutFor(binding("Enter", "Enter", { ctrlKey: true }))).toBe("openThinkPopup");
        expect(fixedShortcutFor(binding("KeyT", "t"))).toBeUndefined();
        expect(isBrowserReserved(binding("KeyW", "w", { ctrlKey: true }))).toBe(true);
        expect(isBrowserReserved(binding("Tab", "Tab"))).toBe(true);
        expect(isBrowserReserved(binding("KeyT", "t"))).toBe(false);
    });
});
