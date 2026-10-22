import { afterEach, beforeEach, expect, test, vi } from "vitest";

// The controller's sequences over time (debounce, close by hand until the return, leaving the world),
// with Electron and the windows faked. The rules themselves are in companion-visibility-policy.test.js.

const fake = vi.hoisted(() => ({
    companion: undefined,
    main: { minimized: false, focused: true },
    presence: {},
    presenceListener: () => {},
    sent: [],
}));

vi.mock("electron", () => ({
    screen: {
        getCursorScreenPoint: () => ({ x: 0, y: 0 }),
        getDisplayNearestPoint: () => ({ id: 1 }),
        getAllDisplays: () => [{ id: 1 }],
    },
}));
vi.mock("electron-log", () => ({ default: { warn: () => {} } }));
vi.mock("./hud-windows", () => ({
    isHudWindowOpen: () => fake.companion !== undefined,
    getHudWindow: () => fake.companion,
    openHudWindow: () => {
        const listeners = {};
        fake.companion = {
            once: (event, callback) => (listeners[event] = callback),
            setContentProtection: () => {},
            // The user closing the window (close shortcut), as opposed to the controller.
            userClose: () => {
                fake.companion = undefined;
                listeners.closed?.();
            },
        };
        return Promise.resolve(true);
    },
    closeHudWindow: () => {
        fake.companion = undefined;
    },
}));
vi.mock("./presence", () => ({
    getPresenceSnapshot: () => fake.presence,
    onPresenceChange: (listener) => (fake.presenceListener = listener),
}));
vi.mock("./window", () => ({
    getWindow: () => ({
        isDestroyed: () => false,
        isVisible: () => true,
        isMinimized: () => fake.main.minimized,
        isFocused: () => fake.main.focused,
    }),
}));
vi.mock("./tab-manager", () => ({
    getControllingWorldContents: () => ({ send: (channel, value) => fake.sent.push(value) }),
}));
vi.mock("./content-protection", () => ({ shouldProtectWindowFromCapture: () => false }));
vi.mock("./screen-identify", () => ({ isIdentifyingScreens: () => false }));

let controller;

beforeEach(async () => {
    vi.useFakeTimers();
    vi.resetModules();
    fake.companion = undefined;
    fake.main = { minimized: false, focused: true };
    fake.presence = { inWorld: true, inMeeting: true, autoOpenAllowed: true };
    fake.sent = [];
    controller = await import("./companion-controller");
    controller.startCompanionController();
});

afterEach(() => {
    vi.useRealTimers();
});

const isOpen = () => fake.companion !== undefined;
const videoWanted = () => fake.sent.at(-1) === true;

async function leaveWA() {
    fake.main = { minimized: true, focused: false };
    controller.onMainWindowHidden();
    await vi.advanceTimersByTimeAsync(500);
}

async function comeBack() {
    fake.main = { minimized: false, focused: true };
    controller.onMainWindowFocus();
    await vi.advanceTimersByTimeAsync(0);
}

async function setPresence(changes) {
    Object.assign(fake.presence, changes);
    fake.presenceListener();
    await vi.advanceTimersByTimeAsync(0);
}

test("opens by itself after the debounce, with the meeting video, and closes when WA shows again", async () => {
    fake.main = { minimized: true, focused: false };
    controller.onMainWindowHidden();
    await vi.advanceTimersByTimeAsync(300);
    expect(isOpen()).toBe(false);
    await vi.advanceTimersByTimeAsync(200);
    expect(isOpen()).toBe(true);
    expect(videoWanted()).toBe(true);

    await comeBack();
    expect(isOpen()).toBe(false);
    expect(videoWanted()).toBe(false);
});

test("a quick away-and-back does not flash it", async () => {
    fake.main = { minimized: true, focused: false };
    controller.onMainWindowHidden();
    await comeBack();
    await vi.advanceTimersByTimeAsync(1000);
    expect(isOpen()).toBe(false);
});

test("closed by hand: stays closed while away, reopens on leaving again after coming back", async () => {
    await leaveWA();
    fake.companion.userClose();
    await vi.advanceTimersByTimeAsync(1000);
    expect(isOpen()).toBe(false);

    await comeBack();
    await leaveWA();
    expect(isOpen()).toBe(true);
});

test("opened by hand: stays while WA shows and after the meeting, then closes on a second toggle", async () => {
    controller.toggleCompanion();
    await vi.advanceTimersByTimeAsync(0);
    expect(isOpen()).toBe(true);
    expect(videoWanted()).toBe(true);

    await comeBack();
    expect(isOpen()).toBe(true);

    await setPresence({ inMeeting: false });
    expect(isOpen()).toBe(true);
    expect(videoWanted()).toBe(false);

    controller.toggleCompanion();
    expect(isOpen()).toBe(false);
});

test("opened by itself: closes when the meeting ends", async () => {
    await leaveWA();
    await setPresence({ inMeeting: false });
    expect(isOpen()).toBe(false);
});

test("the setting off: nothing opens by itself, opening by hand still works", async () => {
    await setPresence({ autoOpenAllowed: false });
    await leaveWA();
    expect(isOpen()).toBe(false);

    controller.toggleCompanion();
    await vi.advanceTimersByTimeAsync(0);
    expect(isOpen()).toBe(true);
});

test("an invitation opens it even after a close by hand", async () => {
    await leaveWA();
    fake.companion.userClose();
    await setPresence({ inMeeting: false, invitationPending: true });
    await vi.advanceTimersByTimeAsync(500);
    expect(isOpen()).toBe(true);
});

test("leaving the world closes it, even opened by hand; a portal hop does not", async () => {
    controller.toggleCompanion();
    await vi.advanceTimersByTimeAsync(0);

    await setPresence({ inWorld: false });
    await vi.advanceTimersByTimeAsync(1000);
    await setPresence({ inWorld: true });
    await vi.advanceTimersByTimeAsync(1000);
    expect(isOpen()).toBe(true);

    await setPresence({ inWorld: false });
    await vi.advanceTimersByTimeAsync(1600);
    expect(isOpen()).toBe(false);
});
