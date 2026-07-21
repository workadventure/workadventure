const test = require("node:test");
const assert = require("node:assert/strict");

const { createDesktopAuthWindowOptions, isExpectedDesktopAuthWindowLoadError } = require("./desktop-auth-window-policy");

test("desktop auth window uses isolated web preferences", () => {
    const options = createDesktopAuthWindowOptions();

    assert.equal(options.width, 520);
    assert.equal(options.height, 720);
    assert.equal(options.autoHideMenuBar, true);
    assert.equal(options.webPreferences.nodeIntegration, false);
    assert.equal(options.webPreferences.contextIsolation, true);
    assert.equal(options.webPreferences.sandbox, true);
    assert.equal(options.webPreferences.webSecurity, true);
});

test("detects expected auth window load cancellations", () => {
    assert.equal(isExpectedDesktopAuthWindowLoadError(new Error("ERR_FAILED (-2) loading 'http://example.test/logout'")), true);
    assert.equal(
        isExpectedDesktopAuthWindowLoadError(new Error("ERR_ABORTED (-3) loading 'http://example.test/login-screen'")),
        true
    );
    assert.equal(isExpectedDesktopAuthWindowLoadError(new Error("ERR_CONNECTION_REFUSED (-102) loading 'http://example.test'")), false);
    assert.equal(isExpectedDesktopAuthWindowLoadError("ERR_FAILED (-2) loading 'http://example.test/logout'"), false);
});
