import { describe, expect, test } from "vitest";
import { acceleratorFromKeyPress, acceleratorLabel, isSettableAccelerator } from "./shortcut-policy";

const press = (key: string, code: string, mods: Partial<Record<"ctrl" | "alt" | "shift" | "meta", boolean>> = {}) => ({
    key,
    code,
    ctrlKey: mods.ctrl === true,
    altKey: mods.alt === true,
    shiftKey: mods.shift === true,
    metaKey: mods.meta === true,
});

describe("acceleratorFromKeyPress", () => {
    test("gives the defaults' form", () => {
        expect(acceleratorFromKeyPress(press("M", "KeyM", { ctrl: true, alt: true, shift: true }), "linux")).toEqual({
            accelerator: "CommandOrControl+Alt+Shift+M",
        });
        expect(acceleratorFromKeyPress(press("µ", "KeyM", { meta: true, alt: true, shift: true }), "darwin")).toEqual({
            accelerator: "CommandOrControl+Alt+Shift+M",
        });
    });

    test("keeps Control apart from Command on macOS, and names the Windows key Super", () => {
        expect(acceleratorFromKeyPress(press("k", "KeyK", { ctrl: true, meta: true }), "darwin")).toEqual({
            accelerator: "CommandOrControl+Control+K",
        });
        expect(acceleratorFromKeyPress(press("k", "KeyK", { meta: true }), "win32")).toEqual({
            accelerator: "Super+K",
        });
    });

    test("names the letter on the key, and the digit by its place", () => {
        // The key left of Z on a French keyboard is Q at US's A.
        expect(acceleratorFromKeyPress(press("a", "KeyQ", { ctrl: true }), "linux")).toEqual({
            accelerator: "CommandOrControl+A",
        });
        // A French keyboard's 1 key without Shift types "&".
        expect(acceleratorFromKeyPress(press("&", "Digit1", { ctrl: true }), "linux")).toEqual({
            accelerator: "CommandOrControl+1",
        });
        expect(acceleratorFromKeyPress(press("ArrowUp", "ArrowUp", { alt: true }), "linux")).toEqual({
            accelerator: "Alt+Up",
        });
        expect(acceleratorFromKeyPress(press("1", "Numpad1", { alt: true }), "linux")).toEqual({
            accelerator: "Alt+num1",
        });
    });

    test("waits while only modifiers are held, and skips keys it cannot name", () => {
        expect(acceleratorFromKeyPress(press("Control", "ControlLeft", { ctrl: true }), "linux")).toBeUndefined();
        expect(acceleratorFromKeyPress(press(",", "Comma", { ctrl: true }), "linux")).toBeUndefined();
    });

    test("refuses a key that would take over typing, but not a function key", () => {
        expect(acceleratorFromKeyPress(press("m", "KeyM"), "linux")).toBe("needs-modifier");
        expect(acceleratorFromKeyPress(press("M", "KeyM", { shift: true }), "linux")).toBe("needs-modifier");
        expect(acceleratorFromKeyPress(press("F9", "F9"), "linux")).toEqual({ accelerator: "F9" });
    });
});

test("isSettableAccelerator accepts what a key press gives, and nothing else", () => {
    expect(isSettableAccelerator("CommandOrControl+Alt+Shift+M")).toBe(true);
    expect(isSettableAccelerator("F9")).toBe(true);
    expect(isSettableAccelerator("Super+num1")).toBe(true);
    expect(isSettableAccelerator("")).toBe(false);
    expect(isSettableAccelerator("Alt+Alt+M")).toBe(false);
    expect(isSettableAccelerator("Hyper+M")).toBe(false);
    expect(isSettableAccelerator("Alt+")).toBe(false);
    expect(isSettableAccelerator("Alt+m")).toBe(false);
});

test("acceleratorLabel uses the system's names", () => {
    expect(acceleratorLabel("CommandOrControl+Alt+Shift+M", "darwin")).toBe("⌥⇧⌘M");
    expect(acceleratorLabel("CommandOrControl+Alt+Shift+M", "linux")).toBe("Ctrl+Alt+Shift+M");
    expect(acceleratorLabel("Super+K", "win32")).toBe("Win+K");
    expect(acceleratorLabel("Super+K", "linux")).toBe("Super+K");
});
