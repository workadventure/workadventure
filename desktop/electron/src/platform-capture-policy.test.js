import { expect, test } from "vitest";
import { canHideWindowsFromCapture, usesSystemScreenSharePicker } from "./platform-capture-policy";

test("the system share dialog is the picker under Wayland only", () => {
    expect(usesSystemScreenSharePicker("linux", { XDG_SESSION_TYPE: "wayland" })).toBe(true);
    expect(usesSystemScreenSharePicker("linux", { XDG_SESSION_TYPE: "x11" })).toBe(false);
    expect(usesSystemScreenSharePicker("linux", {})).toBe(false);
    expect(usesSystemScreenSharePicker("darwin", { XDG_SESSION_TYPE: "wayland" })).toBe(false);
});

test("only macOS and Windows can keep a window out of the capture", () => {
    expect(canHideWindowsFromCapture("darwin")).toBe(true);
    expect(canHideWindowsFromCapture("win32")).toBe(true);
    expect(canHideWindowsFromCapture("linux")).toBe(false);
});
