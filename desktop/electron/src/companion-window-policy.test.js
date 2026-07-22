const test = require("node:test");
const assert = require("node:assert/strict");

const { COMPANION_MIN_WIDTH, COMPANION_MIN_HEIGHT, normalizeCompanionBounds } = require("./companion-window-policy");

const workArea = { x: 0, y: 0, width: 1440, height: 900 };

test("defaults to a bottom-right rectangle when no bounds were saved", () => {
    const bounds = normalizeCompanionBounds(undefined, workArea, { width: 420, height: 560 }, 24);
    assert.deepEqual(bounds, { x: 1440 - 420 - 24, y: 900 - 560 - 24, width: 420, height: 560 });
});

test("keeps a valid saved rectangle as-is", () => {
    const saved = { x: 100, y: 80, width: 500, height: 600 };
    assert.deepEqual(normalizeCompanionBounds(saved, workArea), saved);
});

test("clamps an off-screen / oversized rectangle back into the work area", () => {
    assert.deepEqual(
        normalizeCompanionBounds({ x: -400, y: 900, width: 900, height: 100 }, { x: 0, y: 0, width: 800, height: 600 }),
        { x: 0, y: 240, width: 800, height: COMPANION_MIN_HEIGHT }
    );
});

test("never returns a rectangle below the minimum size", () => {
    const bounds = normalizeCompanionBounds({ x: 10, y: 10, width: 50, height: 50 }, workArea);
    assert.equal(bounds.width, COMPANION_MIN_WIDTH);
    assert.equal(bounds.height, COMPANION_MIN_HEIGHT);
});
