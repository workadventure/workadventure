"use strict";

function createDesktopAuthWindowOptions() {
    return {
        width: 520,
        height: 720,
        autoHideMenuBar: true,
        show: true,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            sandbox: true,
            webSecurity: true,
        },
    };
}

function isExpectedDesktopAuthWindowLoadError(error) {
    if (!(error instanceof Error)) {
        return false;
    }

    return error.message.includes("ERR_FAILED (-2)") || error.message.includes("ERR_ABORTED (-3)");
}

module.exports = {
    createDesktopAuthWindowOptions,
    isExpectedDesktopAuthWindowLoadError,
};
