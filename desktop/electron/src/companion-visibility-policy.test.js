import { expect, test } from "vitest";
import { shouldShowCompanion, latchAfterPresenceChange, latchAfterMainWindowBlur, leftWorld } from "./companion-visibility-policy";

const away = { inWorld: true, mainWindowFocused: false };

// ── The regression this whole policy exists for ──────────────────────────────────────────────
test("stays closed when the user is merely away in a world (no trigger)", () => {
    expect(shouldShowCompanion({ ...away, autoOpenLatch: false })).toBe(false);
});

test("opens once a trigger armed the latch", () => {
    expect(shouldShowCompanion({ ...away, autoOpenLatch: true })).toBe(true);
});

test("stays closed on the landing / login page even with the latch armed", () => {
    expect(shouldShowCompanion({ inWorld: false, mainWindowFocused: false, autoOpenLatch: true })).toBe(false);
});

// ── Precedence ───────────────────────────────────────────────────────────────────────────────
test("screen sharing hides the panel, beating every other rule", () => {
    expect(shouldShowCompanion({ ...away, screenSharing: true, autoOpenLatch: true, invitationPending: true })).toBe(false);
});

test("screen sharing keeps the panel where no meeting bar replaces it (Linux)", () => {
    expect(shouldShowCompanion({ ...away, screenSharing: true, meetingBarAvailable: false, autoOpenLatch: true })).toBe(true);
});

test("focusing WA hides the panel unless the meeting video is running", () => {
    expect(shouldShowCompanion({ inWorld: true, mainWindowFocused: true, autoOpenLatch: true })).toBe(false);
    expect(shouldShowCompanion({ inWorld: true, mainWindowFocused: true, pipActive: true })).toBe(true);
});

test("an incoming invitation reopens the panel even after a manual dismissal", () => {
    expect(shouldShowCompanion({ ...away, override: "force-closed", invitationPending: true, autoOpenLatch: false })).toBe(true);
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
    expect(latchAfterPresenceChange(true, { inWorld: true, inMeeting: true }, { inWorld: true, inMeeting: false })).toBe(false);
});

test("leaving the world disarms the latch", () => {
    expect(latchAfterPresenceChange(true, { inWorld: true, inMeeting: true }, { inWorld: false, inMeeting: false })).toBe(false);
});

// ── Trigger 2: switching away during a meeting ───────────────────────────────────────────────
test("blurring the app during a meeting arms the latch", () => {
    expect(latchAfterMainWindowBlur(false, { inWorld: true, inMeeting: true })).toBe(true);
});

test("blurring the app while alone in a world does NOT arm the latch", () => {
    expect(latchAfterMainWindowBlur(false, { inWorld: true, inMeeting: false })).toBe(false);
});

test("blurring outside a world does NOT arm the latch", () => {
    expect(latchAfterMainWindowBlur(false, { inWorld: false, inMeeting: true })).toBe(false);
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
