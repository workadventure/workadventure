import { expect, test } from "vitest";
import {
    shouldShowCompanion,
    latchAfterPresenceChange,
    latchAfterLeavingApp,
    dismissalAfterPresenceChange,
    displayForAutoOpenDuringShare,
    leftWorld,
} from "../../src/companion-visibility-policy";

const away = { inWorld: true, mainWindowInView: false };

// ── The regression this whole policy exists for ──────────────────────────────────────────────
test("stays closed when the user is merely away in a world (no trigger)", () => {
    expect(shouldShowCompanion({ ...away, autoOpenLatch: false })).toBe(false);
});

test("opens once a trigger armed the latch", () => {
    expect(shouldShowCompanion({ ...away, autoOpenLatch: true })).toBe(true);
});

test("stays closed on the landing / login page even with the latch armed", () => {
    expect(shouldShowCompanion({ inWorld: false, mainWindowInView: false, autoOpenLatch: true })).toBe(false);
});

// ── Precedence ───────────────────────────────────────────────────────────────────────────────
test("WA showing hides the panel unless the meeting video is running", () => {
    expect(shouldShowCompanion({ inWorld: true, mainWindowInView: true, autoOpenLatch: true })).toBe(false);
    expect(shouldShowCompanion({ inWorld: true, mainWindowInView: true, pipActive: true })).toBe(true);
});

test("an incoming invitation reopens the panel even after a manual dismissal", () => {
    expect(
        shouldShowCompanion({ ...away, override: "force-closed", invitationPending: true, autoOpenLatch: false })
    ).toBe(true);
});

test("a manual dismissal beats the latch and the meeting video", () => {
    expect(shouldShowCompanion({ ...away, override: "force-closed", autoOpenLatch: true })).toBe(false);
    expect(shouldShowCompanion({ ...away, override: "force-closed", pipActive: true })).toBe(false);
});

test("a manual open works without any trigger", () => {
    expect(shouldShowCompanion({ ...away, override: "force-open", autoOpenLatch: false })).toBe(true);
});

// ── Trigger 1: a bubble forms ────────────────────────────────────────────────────────────────
test("a bubble forming arms the latch", () => {
    const next = { inWorld: true, inMeeting: true };
    expect(latchAfterPresenceChange(false, { inWorld: true, inMeeting: false }, next)).toBe(true);
});

test("staying in an established meeting keeps the latch as-is", () => {
    const both = { inWorld: true, inMeeting: true };
    expect(latchAfterPresenceChange(true, both, both)).toBe(true);
    expect(latchAfterPresenceChange(false, both, both)).toBe(false);
});

test("leaving the meeting disarms the latch", () => {
    expect(
        latchAfterPresenceChange(true, { inWorld: true, inMeeting: true }, { inWorld: true, inMeeting: false })
    ).toBe(false);
});

test("leaving the world disarms the latch", () => {
    expect(
        latchAfterPresenceChange(true, { inWorld: true, inMeeting: true }, { inWorld: false, inMeeting: false })
    ).toBe(false);
});

// ── Trigger 2: leaving the app during a meeting ──────────────────────────────────────────────
test("leaving the app during a meeting arms the latch", () => {
    expect(latchAfterLeavingApp(false, { inWorld: true, inMeeting: true })).toBe(true);
});

test("leaving the app while alone in a world does NOT arm the latch", () => {
    expect(latchAfterLeavingApp(false, { inWorld: true, inMeeting: false })).toBe(false);
});

test("leaving outside a world does NOT arm the latch", () => {
    expect(latchAfterLeavingApp(false, { inWorld: false, inMeeting: true })).toBe(false);
});

// ── During the user's own screen share ──────────────────────────────────────────────────────
test("the auto-show waits for a place to land", () => {
    expect(shouldShowCompanion({ ...away, autoOpenLatch: true, autoOpenAllowed: false })).toBe(false);
    expect(shouldShowCompanion({ ...away, override: "force-open", autoOpenAllowed: false })).toBe(true);
});

test("during a share, it opens by itself only on another screen than the shared one", () => {
    // A single screen, or a shared screen unknown (a window is shared): nowhere.
    expect(displayForAutoOpenDuringShare([1], 1, 1)).toBeUndefined();
    expect(displayForAutoOpenDuringShare([1, 2], undefined, 1)).toBeUndefined();
    // The screen under the pointer when it is not the shared one, another one otherwise.
    expect(displayForAutoOpenDuringShare([1, 2, 3], 1, 3)).toBe(3);
    expect(displayForAutoOpenDuringShare([1, 2, 3], 1, 1)).toBe(2);
});

// ── Dismissal ────────────────────────────────────────────────────────────────────────────────
test("a dismissal holds for the rest of the meeting", () => {
    const meeting = { inWorld: true, inMeeting: true };
    expect(dismissalAfterPresenceChange(true, meeting, meeting)).toBe(true);
});

test("a dismissal ends with the meeting, with the next one, or when leaving the world", () => {
    expect(
        dismissalAfterPresenceChange(true, { inWorld: true, inMeeting: true }, { inWorld: true, inMeeting: false })
    ).toBe(false);
    expect(
        dismissalAfterPresenceChange(true, { inWorld: true, inMeeting: false }, { inWorld: true, inMeeting: true })
    ).toBe(false);
    expect(
        dismissalAfterPresenceChange(true, { inWorld: true, inMeeting: true }, { inWorld: false, inMeeting: true })
    ).toBe(false);
});

// ── World change ─────────────────────────────────────────────────────────────────────────────
test("detects the crossing out of a world", () => {
    expect(leftWorld({ inWorld: true }, { inWorld: false })).toBe(true);
});

test("does not fire when already outside, or while staying inside", () => {
    expect(leftWorld({ inWorld: false }, { inWorld: false })).toBe(false);
    expect(leftWorld({ inWorld: true }, { inWorld: true })).toBe(false);
    expect(leftWorld({ inWorld: false }, { inWorld: true })).toBe(false);
});

// ── WA keeps showing ─────────────────────────────────────────────────────────────────────────
test("WA still showing (on another screen, or only unfocused) keeps the panel closed, even with the latch armed", () => {
    expect(shouldShowCompanion({ inWorld: true, mainWindowInView: true, autoOpenLatch: true })).toBe(false);
});
