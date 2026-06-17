import { describe, expect, it } from "vitest";
import { isUserAwayFromApp } from "./DesktopVisibilityPolicy";

describe("isUserAwayFromApp", () => {
    it("returns false when the web document is visible and no desktop state is available", () => {
        expect(isUserAwayFromApp(true, undefined)).toBe(false);
    });

    it("returns true when the web document is hidden", () => {
        expect(isUserAwayFromApp(false, undefined)).toBe(true);
    });

    it("returns true when the desktop window is not focused", () => {
        expect(isUserAwayFromApp(true, { focused: false, visible: true, minimized: false })).toBe(true);
    });

    it("returns true when the desktop window is minimized", () => {
        expect(isUserAwayFromApp(true, { focused: true, visible: true, minimized: true })).toBe(true);
    });

    it("returns true when the desktop window is hidden", () => {
        expect(isUserAwayFromApp(true, { focused: true, visible: false, minimized: false })).toBe(true);
    });
});
