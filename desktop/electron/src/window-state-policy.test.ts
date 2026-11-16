import { expect, test } from "vitest";
import { shouldMaximizeBeforeLoad } from "./window-state-policy";

test("maximizes before loading remote content on first launch without persisted bounds", () => {
    expect(shouldMaximizeBeforeLoad({ width: 1000, height: 800 })).toBe(true);
});

test("preserves a normal restored window with persisted bounds", () => {
    expect(shouldMaximizeBeforeLoad({ x: 10, y: 20, width: 1200, height: 900 })).toBe(false);
});

test("restores a maximized window before loading remote content", () => {
    expect(shouldMaximizeBeforeLoad({ x: 10, y: 20, width: 1200, height: 900, isMaximized: true })).toBe(true);
});
