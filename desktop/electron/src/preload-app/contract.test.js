import { beforeAll, expect, test, vi } from "vitest";

// What window.WAD exposes to a world page is a contract with WorkAdventure servers of other versions
// (self-hosted servers stay on older releases while the app updates). A published member never goes away
// and never changes shape: NEVER remove a name from these lists, add a new name for a new shape.

/** Contract 1: what the desktop app of master exposed, and all that WorkAdventure servers before it call. */
const CONTRACT_1 = [
    "desktop",
    "isDevelopment",
    "getVersion",
    "notify",
    "onMuteToggle",
    "onCameraToggle",
    "getDesktopCapturerSources",
];

/** Contract 2: added with the handshake. */
const CONTRACT_2 = [
    "hello",
    "notifyMessage",
    "onNotificationClick",
    "setKeepAwake",
    "setUnreadCount",
    "setPresence",
    "setScreenShareSource",
    "onRequestPresence",
    "setTabTitle",
    "onSystemIdle",
    "onMediaPreempted",
    "onOtherMeetingMuted",
    "identifyScreens",
    "cancelIdentifyScreens",
    "screenPermission",
    "navigation",
    "windows",
];

const sent = [];
let exposed = {};

vi.mock("electron", () => ({
    contextBridge: {
        exposeInMainWorld: (key, api) => {
            if (key === "WAD") exposed = api;
        },
    },
    ipcRenderer: {
        send: (channel, payload) => sent.push([channel, payload]),
        sendSync: () => ({ contract: 2 }),
        invoke: () => Promise.resolve(),
        on: () => undefined,
        removeListener: () => undefined,
    },
}));

beforeAll(async () => {
    // A world page on X11/macOS/Windows: the app lists the screens itself.
    vi.stubGlobal("location", { protocol: "https:" });
    vi.stubGlobal("document", { addEventListener: () => undefined, visibilityState: "visible" });
    vi.stubEnv("XDG_SESSION_TYPE", "x11");
    await import("./preload");
});

test("every published member is still exposed to world pages", () => {
    for (const name of [...CONTRACT_1, ...CONTRACT_2]) {
        expect(exposed, name).toHaveProperty(name);
    }
});

test("contract 1 keeps its shapes", () => {
    expect(exposed.desktop).toBe(true);
    for (const name of CONTRACT_1.slice(1)) {
        expect(typeof exposed[name], name).toBe("function");
    }
    // notify(text): the text, as a string, like the app of master.
    exposed.notify("hello");
    expect(sent.at(-1)).toEqual(["app:notify", "hello"]);
});

test("the floating windows API keeps its members", () => {
    for (const name of [
        "onOpen",
        "onMeetingWanted",
        "toggleCompanion",
        "openCompanion",
        "dismissCompanion",
        "focusMain",
        "visibleInShare",
        "tabStripShown",
        "toggleTabStrip",
    ]) {
        expect(typeof exposed.windows[name], name).toBe("function");
    }
});

test("world pages do not get what only the native Landing uses", () => {
    expect(Object.keys(exposed.navigation).sort()).toEqual(["joinWorld", "openAdminSignup"]);
});
