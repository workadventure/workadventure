const test = require("node:test");
const assert = require("node:assert/strict");

const { shouldMaximizeBeforeLoad } = require("./window-state-policy");

test("maximizes before loading remote content on first launch without persisted bounds", () => {
    assert.equal(shouldMaximizeBeforeLoad({ width: 1000, height: 800 }), true);
});

test("preserves a normal restored window with persisted bounds", () => {
    assert.equal(shouldMaximizeBeforeLoad({ x: 10, y: 20, width: 1200, height: 900 }), false);
});

test("restores a maximized window before loading remote content", () => {
    assert.equal(shouldMaximizeBeforeLoad({ x: 10, y: 20, width: 1200, height: 900, isMaximized: true }), true);
});
