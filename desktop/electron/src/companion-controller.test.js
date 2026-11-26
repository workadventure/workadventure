import { afterEach, beforeEach, expect, test, vi } from "vitest";

// The controller's sequences over time (debounce, close by hand until the return, leaving the world),
// with Electron and the windows faked. The rules themselves are in companion-visibility-policy.test.js.

const fake = vi.hoisted(() => ({
    companion: undefined,
    main: { minimized: false, focused: true },
    presence: {},
    presenceListener: () => {},
    sent: [],
    displays: [1],
    identifying: false,
    canHide: true,
    windowDisplay: 1,
    pointerDisplay: 1,
    focusedWindow: null,
    wayland: false,
    appBlur: () => {},
    logs: [],
}));

vi.mock("electron", () => ({
    app: { on: (event, callback) => event === "browser-window-blur" && (fake.appBlur = callback) },
    BrowserWindow: { getFocusedWindow: () => fake.focusedWindow },
    screen: {
        getCursorScreenPoint: () => ({ x: 0, y: 0 }),
        getDisplayNearestPoint: () => ({ id: fake.pointerDisplay }),
        getDisplayMatching: () => ({ id: fake.windowDisplay }),
        getAllDisplays: () => fake.displays.map((id) => ({ id })),
    },
}));
vi.mock("electron-log", () => ({ default: { warn: () => {}, info: (message) => fake.logs.push(message) } }));
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
        getBounds: () => ({ x: 0, y: 0, width: 1, height: 1 }),
    }),
}));
vi.mock("./tab-manager", () => ({
    getControllingWorldContents: () => ({ send: (channel, value) => fake.sent.push(value) }),
}));
vi.mock("./content-protection", () => ({ shouldProtectWindowFromCapture: () => false }));
vi.mock("./platform-capture-policy", () => ({
    canHideWindowsFromCapture: () => fake.canHide,
    usesSystemScreenSharePicker: () => fake.wayland,
}));
vi.mock("./screen-identify", () => ({ isIdentifyingScreens: () => fake.identifying }));

let controller;

beforeEach(async () => {
    vi.useFakeTimers();
    vi.resetModules();
    fake.companion = undefined;
    fake.main = { minimized: false, focused: true };
    fake.presence = { inWorld: true, inMeeting: true, autoOpenAllowed: true };
    fake.sent = [];
    fake.displays = [1];
    fake.identifying = false;
    fake.canHide = true;
    fake.windowDisplay = 1;
    fake.pointerDisplay = 1;
    fake.focusedWindow = null;
    fake.wayland = false;
    fake.logs = [];
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

test("a page hidden while WA has the focus is a tab switch inside WA, not leaving it", async () => {
    controller.onPageVisibilityChange(true);
    await vi.advanceTimersByTimeAsync(1000);
    expect(isOpen()).toBe(false);
});

test("WA fully covered (page hidden without the focus) is leaving it; showing again closes it", async () => {
    fake.main = { minimized: false, focused: false };
    controller.onPageVisibilityChange(true);
    await vi.advanceTimersByTimeAsync(500);
    expect(isOpen()).toBe(true);

    controller.onPageVisibilityChange(false);
    await vi.advanceTimersByTimeAsync(0);
    expect(isOpen()).toBe(false);
});

test("during the user's share on a single screen, nothing opens by itself; by hand it does", async () => {
    await setPresence({ screenSharing: true });
    controller.setSharedScreenDisplay(1);
    await leaveWA();
    expect(isOpen()).toBe(false);

    controller.toggleCompanion();
    await vi.advanceTimersByTimeAsync(0);
    expect(isOpen()).toBe(true);
});

test("during the user's share with another screen, it opens by itself", async () => {
    fake.displays = [1, 2];
    await setPresence({ screenSharing: true });
    controller.setSharedScreenDisplay(1);
    await leaveWA();
    expect(isOpen()).toBe(true);
});

test("a companion already open stays when the user starts sharing their only screen", async () => {
    await leaveWA();
    await setPresence({ screenSharing: true });
    controller.setSharedScreenDisplay(1);
    await vi.advanceTimersByTimeAsync(500);
    expect(isOpen()).toBe(true);
});

test('during "Identify screens": its windows hiding WA are not leaving it, and nothing opens by itself', async () => {
    fake.identifying = true;
    fake.main = { minimized: false, focused: false };
    controller.onPageVisibilityChange(true);
    await vi.advanceTimersByTimeAsync(500);
    expect(isOpen()).toBe(false);

    await leaveWA();
    expect(isOpen()).toBe(false);
});

test("on Linux, during the user's share, it never opens by itself, even with another screen", async () => {
    fake.canHide = false;
    fake.displays = [1, 2];
    await setPresence({ screenSharing: true });
    controller.setSharedScreenDisplay(1);
    await leaveWA();
    expect(isOpen()).toBe(false);
});

// Focus leaving WA. `focusTo` is the window that gets it: null for another application, or one of the
// app's own windows (meeting bar, companion). 500 ms is past the 400 ms open debounce.
async function focusTo(window) {
    fake.main = { minimized: false, focused: false };
    fake.focusedWindow = window;
    fake.appBlur();
    await vi.advanceTimersByTimeAsync(500);
}
const bar = { name: "meeting bar" };

test("another application with the pointer on WA's screen is leaving it; coming back closes it", async () => {
    await focusTo(null);
    expect(isOpen()).toBe(true);

    fake.focusedWindow = {};
    await comeBack();
    expect(isOpen()).toBe(false);
});

test("another application with the pointer on another screen is not leaving it", async () => {
    fake.pointerDisplay = 2;
    await focusTo(null);
    expect(isOpen()).toBe(false);
});

test("on Wayland the pointer position is unknown: any blur is leaving it", async () => {
    fake.wayland = true;
    fake.pointerDisplay = 2;
    await focusTo(null);
    expect(isOpen()).toBe(true);
});

test("focus moving to the meeting bar opens nothing; from the bar to another application opens it", async () => {
    await focusTo(bar);
    expect(isOpen()).toBe(false);

    await focusTo(null);
    expect(isOpen()).toBe(true);
});

test("opened by itself, it stays open while the focus moves to it then to the bar", async () => {
    await focusTo(null);
    fake.pointerDisplay = 2;
    await focusTo(fake.companion);
    await focusTo(bar);
    expect(isOpen()).toBe(true);
});

test('a blur during "Identify screens" is not leaving it', async () => {
    fake.identifying = true;
    await focusTo(null);
    expect(isOpen()).toBe(false);
});

test("an invitation while the focus is in the meeting bar does not open it", async () => {
    await focusTo(bar);
    await setPresence({ inMeeting: false, invitationPending: true });
    await vi.advanceTimersByTimeAsync(500);
    expect(isOpen()).toBe(false);
});

test("WA shown again without the focus closes it", async () => {
    await focusTo(null);
    controller.onMainWindowShown();
    await vi.advanceTimersByTimeAsync(0);
    expect(isOpen()).toBe(false);
});

test("an automatic open logs the flags that caused it", async () => {
    await focusTo(null);
    expect(fake.logs.some((line) => line.startsWith("Companion auto-open:") && line.includes("leftApp=true"))).toBe(
        true
    );
});
