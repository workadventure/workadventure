const test = require("node:test");
const assert = require("node:assert/strict");

const {
    shouldShowCompanion,
    latchAfterPresenceChange,
    latchAfterMainWindowBlur,
    leftWorld,
} = require("./companion-visibility-policy");

const away = { inWorld: true, mainWindowFocused: false };

// ── The regression this whole policy exists for ──────────────────────────────────────────────
test("stays closed when the user is merely away in a world (no trigger)", () => {
    assert.equal(shouldShowCompanion({ ...away, autoOpenLatch: false }), false);
});

test("opens once a trigger armed the latch", () => {
    assert.equal(shouldShowCompanion({ ...away, autoOpenLatch: true }), true);
});

test("stays closed on the landing / login page even with the latch armed", () => {
    assert.equal(shouldShowCompanion({ inWorld: false, mainWindowFocused: false, autoOpenLatch: true }), false);
});

// ── Precedence ───────────────────────────────────────────────────────────────────────────────
test("screen sharing hides the panel, beating every other rule", () => {
    assert.equal(
        shouldShowCompanion({ ...away, screenSharing: true, autoOpenLatch: true, invitationPending: true }),
        false
    );
});

test("focusing WA hides the panel unless the meeting video is running", () => {
    assert.equal(shouldShowCompanion({ inWorld: true, mainWindowFocused: true, autoOpenLatch: true }), false);
    assert.equal(shouldShowCompanion({ inWorld: true, mainWindowFocused: true, pipActive: true }), true);
});

test("an incoming invitation reopens the panel even after a manual dismissal", () => {
    assert.equal(
        shouldShowCompanion({ ...away, override: "force-closed", invitationPending: true, autoOpenLatch: false }),
        true
    );
});

test("a manual dismissal beats the latch and the meeting video", () => {
    assert.equal(shouldShowCompanion({ ...away, override: "force-closed", autoOpenLatch: true }), false);
    assert.equal(shouldShowCompanion({ ...away, override: "force-closed", pipActive: true }), false);
});

test("a manual open works without any trigger", () => {
    assert.equal(shouldShowCompanion({ ...away, override: "force-open", autoOpenLatch: false }), true);
});

// ── Trigger 1: a bubble forms ────────────────────────────────────────────────────────────────
test("a bubble forming arms the latch", () => {
    const next = { inWorld: true, inMeeting: true };
    assert.equal(latchAfterPresenceChange(false, { inWorld: true, inMeeting: false }, next), true);
});

test("staying in an established meeting keeps the latch as-is", () => {
    const both = { inWorld: true, inMeeting: true };
    assert.equal(latchAfterPresenceChange(true, both, both), true);
    assert.equal(latchAfterPresenceChange(false, both, both), false);
});

test("leaving the meeting disarms the latch", () => {
    assert.equal(
        latchAfterPresenceChange(true, { inWorld: true, inMeeting: true }, { inWorld: true, inMeeting: false }),
        false
    );
});

test("leaving the world disarms the latch", () => {
    assert.equal(
        latchAfterPresenceChange(true, { inWorld: true, inMeeting: true }, { inWorld: false, inMeeting: false }),
        false
    );
});

// ── Trigger 2: switching away during a meeting ───────────────────────────────────────────────
test("blurring the app during a meeting arms the latch", () => {
    assert.equal(latchAfterMainWindowBlur(false, { inWorld: true, inMeeting: true }), true);
});

test("blurring the app while alone in a world does NOT arm the latch", () => {
    assert.equal(latchAfterMainWindowBlur(false, { inWorld: true, inMeeting: false }), false);
});

test("blurring outside a world does NOT arm the latch", () => {
    assert.equal(latchAfterMainWindowBlur(false, { inWorld: false, inMeeting: true }), false);
});

// ── World change ─────────────────────────────────────────────────────────────────────────────
test("detects the crossing out of a world", () => {
    assert.equal(leftWorld({ inWorld: true }, { inWorld: false }), true);
});

test("does not fire when already outside, or while staying inside", () => {
    assert.equal(leftWorld({ inWorld: false }, { inWorld: false }), false);
    assert.equal(leftWorld({ inWorld: true }, { inWorld: true }), false);
    assert.equal(leftWorld({ inWorld: false }, { inWorld: true }), false);
});
