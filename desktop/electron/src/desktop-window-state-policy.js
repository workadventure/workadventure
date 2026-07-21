"use strict";

function createDesktopWindowState(window) {
    if (!window) {
        return {
            focused: false,
            visible: false,
            minimized: false,
        };
    }

    return {
        focused: window.isFocused(),
        visible: window.isVisible(),
        minimized: window.isMinimized(),
    };
}

module.exports = {
    createDesktopWindowState,
};
