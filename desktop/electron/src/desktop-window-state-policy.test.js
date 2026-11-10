import { expect, test } from "vitest";
import { createDesktopWindowState } from "./desktop-window-state-policy";

test("creates a visible focused desktop window state", () => {
    const state = createDesktopWindowState({
        isFocused: () => true,
        isVisible: () => true,
        isMinimized: () => false,
    });

    expect(state).toStrictEqual({
        focused: true,
        visible: true,
        minimized: false,
    });
});

test("creates a hidden minimized desktop window state", () => {
    const state = createDesktopWindowState({
        isFocused: () => false,
        isVisible: () => false,
        isMinimized: () => true,
    });

    expect(state).toStrictEqual({
        focused: false,
        visible: false,
        minimized: true,
    });
});

test("uses a safe inactive state when no window exists", () => {
    expect(createDesktopWindowState(undefined)).toStrictEqual({
        focused: false,
        visible: false,
        minimized: false,
    });
});
