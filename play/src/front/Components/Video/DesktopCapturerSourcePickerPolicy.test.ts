import { describe, expect, it } from "vitest";
import { getDesktopCapturerSourceKind } from "./DesktopCapturerSourcePickerPolicy";

describe("DesktopCapturerSourcePickerPolicy", () => {
    it("detects screen sources from Electron source ids", () => {
        expect(getDesktopCapturerSourceKind({ id: "screen:0:0" })).toBe("screen");
    });

    it("detects window sources from Electron source ids", () => {
        expect(getDesktopCapturerSourceKind({ id: "window:123:0" })).toBe("window");
    });

    it("falls back to window for unknown source ids", () => {
        expect(getDesktopCapturerSourceKind({ id: "unknown" })).toBe("window");
    });
});
