const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

const { createDefaultProtocolClientArgs } = require("./protocol-client-policy");

test("uses an absolute main script path for default-app protocol registration", () => {
    const args = createDefaultProtocolClientArgs({
        defaultApp: true,
        argv: ["/usr/local/bin/electron", "dist/main.js"],
        cwd: "/workadventure/desktop/electron",
    });

    assert.deepEqual(args, [path.resolve("/workadventure/desktop/electron", "dist/main.js")]);
});

test("uses an absolute main script path for development Electron binaries that do not expose defaultApp", () => {
    const args = createDefaultProtocolClientArgs({
        defaultApp: false,
        argv: ["/Users/me/Library/Application Support/Electron/Electron.app/Contents/MacOS/Electron", "dist/main.js"],
        cwd: "/workadventure/desktop/electron",
    });

    assert.deepEqual(args, [path.resolve("/workadventure/desktop/electron", "dist/main.js")]);
});

test("does not pass an extra main script argument for packaged protocol registration", () => {
    const args = createDefaultProtocolClientArgs({
        defaultApp: false,
        argv: ["/Applications/WorkAdventure.app/Contents/MacOS/WorkAdventure"],
        cwd: "/workadventure/desktop/electron",
    });

    assert.deepEqual(args, []);
});
