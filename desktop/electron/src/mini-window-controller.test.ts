import { afterEach, beforeEach, expect, test, vi } from "vitest";

// The controller's sequences over time (debounce, close by hand until the return, leaving the world),
// with Electron and the windows faked. The rules themselves are in mini-window-visibility-policy.test.ts.

type FakeMiniWindow = {
    once: (event: string, callback: () => void) => void;
    setContentProtection: () => void;
    userClose: () => void;
};

const fake = vi.hoisted(() => ({
    miniWindow: undefined as FakeMiniWindow | undefined,
    main: { minimized: false, focused: true },
    presence: {},
    presenceListener: () => {},
    sent: [] as unknown[],
    displays: [1],
    identifying: false,
    canHide: true,
}));

vi.mock("electron", () => ({
    screen: {
        getCursorScreenPoint: () => ({ x: 0, y: 0 }),
        getDisplayNearestPoint: () => ({ id: 1 }),
        getAllDisplays: () => fake.displays.map((id) => ({ id })),
    },
}));
vi.mock("electron-log", () => ({ default: { warn: () => {} } }));
vi.mock("./hud-windows", () => ({
    isHudWindowOpen: () => fake.miniWindow !== undefined,
    getHudWindow: () => fake.miniWindow,
    closeHudWindow: () => {
        fake.miniWindow = undefined;
    },
}));
// Opening the window goes through the world page (window.open), faked here.
vi.mock("./child-windows", () => ({
    openChildWindow: () => {
        const listeners: Record<string, () => void> = {};
        fake.miniWindow = {
            once: (event: string, callback: () => void) => {
                listeners[event] = callback;
            },
            setContentProtection: () => {},
            // The user closing the window (close shortcut), as opposed to the controller.
            userClose: () => {
                fake.miniWindow = undefined;
                listeners.closed?.();
            },
        };
        return Promise.resolve(true);
    },
}));
vi.mock("./presence", () => ({
    getPresenceSnapshot: () => fake.presence,
    onPresenceChange: (listener: () => void) => (fake.presenceListener = listener),
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
    getControllingWorldContents: () => ({ send: (_channel: string, value: unknown) => fake.sent.push(value) }),
}));
vi.mock("./content-protection", () => ({ shouldProtectWindowFromCapture: () => false }));
vi.mock("./platform-capture-policy", () => ({ canHideWindowsFromCapture: () => fake.canHide }));
vi.mock("./screen-identify", () => ({ isIdentifyingScreens: () => fake.identifying }));

let controller: typeof import("./mini-window-controller");

beforeEach(async () => {
    vi.useFakeTimers();
    vi.resetModules();
    fake.miniWindow = undefined;
    fake.main = { minimized: false, focused: true };
    fake.presence = { inWorld: true, inMeeting: true, withOthers: true, autoOpenAllowed: true };
    fake.sent = [];
    fake.displays = [1];
    fake.identifying = false;
    fake.canHide = true;
    controller = await import("./mini-window-controller");
    controller.startMiniWindowController();
});

afterEach(() => {
    vi.useRealTimers();
});

const isOpen = () => fake.miniWindow !== undefined;
const videoWanted = () => fake.sent.at(-1) === true;

function closeByHand() {
    if (!fake.miniWindow) {
        throw new Error("The mini window is not open");
    }
    fake.miniWindow.userClose();
}

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

async function setPresence(changes: Record<string, unknown>) {
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
    closeByHand();
    await vi.advanceTimersByTimeAsync(1000);
    expect(isOpen()).toBe(false);

    await comeBack();
    await leaveWA();
    expect(isOpen()).toBe(true);
});

test("opened by hand: stays while WA shows and after the meeting, then closes on a second toggle", async () => {
    controller.toggleMiniWindow();
    await vi.advanceTimersByTimeAsync(0);
    expect(isOpen()).toBe(true);
    expect(videoWanted()).toBe(true);

    await comeBack();
    expect(isOpen()).toBe(true);

    await setPresence({ inMeeting: false });
    expect(isOpen()).toBe(true);
    expect(videoWanted()).toBe(false);

    controller.toggleMiniWindow();
    expect(isOpen()).toBe(false);
});

test("opened by itself: closes when the meeting ends", async () => {
    await leaveWA();
    await setPresence({ inMeeting: false, withOthers: false });
    expect(isOpen()).toBe(false);
});

test("opened by itself: closes when the user is left alone in a meeting room, which goes on", async () => {
    await leaveWA();
    expect(isOpen()).toBe(true);
    await setPresence({ withOthers: false });
    expect(isOpen()).toBe(false);
    // Someone comes back: it opens again.
    await setPresence({ withOthers: true });
    await vi.advanceTimersByTimeAsync(500);
    expect(isOpen()).toBe(true);
});

test("the setting off: nothing opens by itself, opening by hand still works", async () => {
    await setPresence({ autoOpenAllowed: false });
    await leaveWA();
    expect(isOpen()).toBe(false);

    controller.toggleMiniWindow();
    await vi.advanceTimersByTimeAsync(0);
    expect(isOpen()).toBe(true);
});

test("an invitation opens it even after a close by hand", async () => {
    await leaveWA();
    closeByHand();
    await setPresence({ inMeeting: false, withOthers: false, invitationPending: true });
    await vi.advanceTimersByTimeAsync(500);
    expect(isOpen()).toBe(true);
});

test("leaving the world closes it, even opened by hand; a portal hop does not", async () => {
    controller.toggleMiniWindow();
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

    controller.toggleMiniWindow();
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

test("a mini window already open stays when the user starts sharing their only screen", async () => {
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
