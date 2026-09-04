"use strict";

function shouldMaximizeBeforeLoad(windowState) {
    return Boolean(
        windowState.isMaximized ||
            (!windowState.isFullScreen && (windowState.x === undefined || windowState.y === undefined))
    );
}

module.exports = {
    shouldMaximizeBeforeLoad,
};
