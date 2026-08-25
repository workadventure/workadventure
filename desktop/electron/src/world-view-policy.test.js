"use strict";

const test = require("node:test");
const assert = require("node:assert");

const { createWorldViewWebPreferences } = require("./world-view-policy");

test("world views keep rendering while the window is away", () => {
    // Not cosmetic: Phaser's loop runs on requestAnimationFrame, and Chromium schedules no frames
    // for a hidden window. Throttled, a world loading in the background never reaches the map.
    // e2e/background-rendering.js proves this flag still has that effect on the shipped Electron.
    assert.strictEqual(createWorldViewWebPreferences("/preload.js").backgroundThrottling, false);
});

test("world views keep the hardened renderer settings", () => {
    const preferences = createWorldViewWebPreferences("/preload.js");
    assert.strictEqual(preferences.nodeIntegration, false);
    assert.strictEqual(preferences.contextIsolation, true);
    assert.strictEqual(preferences.sandbox, true);
    assert.strictEqual(preferences.webSecurity, true);
    assert.strictEqual(preferences.preload, "/preload.js");
});
