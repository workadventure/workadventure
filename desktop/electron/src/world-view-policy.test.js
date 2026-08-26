"use strict";

const test = require("node:test");
const assert = require("node:assert");

const { createWorldViewWebPreferences } = require("./world-view-policy");

test("world views keep the hardened renderer settings", () => {
    const preferences = createWorldViewWebPreferences("/preload.js");
    assert.strictEqual(preferences.nodeIntegration, false);
    assert.strictEqual(preferences.contextIsolation, true);
    assert.strictEqual(preferences.sandbox, true);
    assert.strictEqual(preferences.webSecurity, true);
    assert.strictEqual(preferences.preload, "/preload.js");
});
