import { beforeEach, expect, test, vi } from "vitest";

// The world page may only open a floating window while main is asking for that one: any other
// window.open (another name, another URL, no pending request) is left to the usual handler.

const fake = vi.hoisted(() => ({ sent: [], adopted: [], world: true, hello: true }));

vi.mock("electron-log", () => ({ default: { warn: () => {} } }));
vi.mock("./settings", () => ({ default: { get: () => undefined } }));
vi.mock("./hud-windows", () => ({
    HUD_SIZES: { companion: { width: 340, height: 480 }, "meeting-bar": { width: 680, height: 76 } },
    resolveDisplay: () => ({ workArea: { x: 0, y: 0, width: 1920, height: 1080 } }),
    meetingBarBounds: () => ({ x: 620, y: 980, width: 680, height: 76 }),
    setUpHudWindow: (kind, window) => fake.adopted.push([kind, window]),
}));
vi.mock("./page-contract", () => ({ pageSaidHello: () => fake.hello }));
vi.mock("./tab-manager", () => ({
    getControllingWorldContents: () =>
        fake.world ? { send: (channel, kind) => fake.sent.push([channel, kind]) } : undefined,
}));

const { adoptChildWindow, childWindowOptions, openChildWindow } = await import("./child-windows");

const childWindow = () => ({});

beforeEach(() => {
    fake.sent = [];
    fake.adopted = [];
    fake.world = true;
    fake.hello = true;
});

test("refuses every window.open while main is not asking", () => {
    expect(childWindowOptions("about:blank", "wa-companion")).toBeUndefined();
    expect(childWindowOptions("about:blank", "wa-meeting-bar")).toBeUndefined();
    adoptChildWindow(childWindow(), "wa-companion");
    expect(fake.adopted).toEqual([]);
});

test("asks the world page, allows only the window asked for, and adopts it", async () => {
    const opened = openChildWindow("companion", 1);
    expect(fake.sent).toEqual([["app:windows:open", "companion"]]);
    expect(childWindowOptions("https://evil.example/", "wa-companion")).toBeUndefined();
    expect(childWindowOptions("about:blank", "other")).toBeUndefined();
    expect(childWindowOptions("about:blank", "wa-meeting-bar")).toBeUndefined();
    expect(childWindowOptions("about:blank", "wa-companion")).toMatchObject({ frame: false, alwaysOnTop: true });

    const window = childWindow();
    adoptChildWindow(window, "wa-companion");
    await expect(opened).resolves.toBe(true);
    expect(fake.adopted).toEqual([["companion", window]]);
    // The request is over: a second window.open is refused again.
    expect(childWindowOptions("about:blank", "wa-companion")).toBeUndefined();
});

test("places the meeting bar where main computed it, see-through", async () => {
    const opened = openChildWindow("meeting-bar", 1);
    expect(childWindowOptions("about:blank", "wa-meeting-bar")).toMatchObject({
        x: 620,
        y: 980,
        transparent: true,
        resizable: false,
    });
    adoptChildWindow(childWindow(), "wa-meeting-bar");
    await expect(opened).resolves.toBe(true);
});

test("gives up when the world page does not open the window in time", async () => {
    vi.useFakeTimers();
    const opened = openChildWindow("companion", 1);
    vi.advanceTimersByTime(3000);
    await expect(opened).resolves.toBe(false);
    expect(childWindowOptions("about:blank", "wa-companion")).toBeUndefined();
    vi.useRealTimers();
});

test("does not ask when no world controls the floating windows", async () => {
    fake.world = false;
    await expect(openChildWindow("companion", 1)).resolves.toBe(false);
    expect(fake.sent).toEqual([]);
});

test("does not ask a page that did not say hello (an older WorkAdventure)", async () => {
    fake.hello = false;
    await expect(openChildWindow("companion", 1)).resolves.toBe(false);
    await expect(openChildWindow("meeting-bar", 1)).resolves.toBe(false);
    expect(fake.sent).toEqual([]);
});
