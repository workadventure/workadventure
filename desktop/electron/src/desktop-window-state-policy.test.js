const test = require("node:test");
const assert = require("node:assert/strict");

const { createDesktopWindowState } = require("./desktop-window-state-policy");

test("creates a visible focused desktop window state", () => {
    const state = createDesktopWindowState({
        isFocused: () => true,
        isVisible: () => true,
        isMinimized: () => false,
    });

    assert.deepEqual(state, {
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

    assert.deepEqual(state, {
        focused: false,
        visible: false,
        minimized: true,
    });
});

test("uses a safe inactive state when no window exists", () => {
    assert.deepEqual(createDesktopWindowState(undefined), {
        focused: false,
        visible: false,
        minimized: false,
    });
});
