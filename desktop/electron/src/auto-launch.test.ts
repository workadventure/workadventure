import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { beforeEach, expect, test, vi } from "vitest";

// Linux: the XDG autostart entry is the setting itself (no copy in settings.json).
const appData = fs.mkdtempSync(path.join(os.tmpdir(), "wa-autostart-"));
const file = path.join(appData, "autostart", "workadventure.desktop");
const loginItem = { executableWillLaunchAtLogin: false };
const setLoginItemSettings = vi.fn<(settings: unknown) => void>();
vi.mock("electron", () => ({
    app: {
        getPath: () => appData,
        isPackaged: true,
        getLoginItemSettings: () => loginItem,
        setLoginItemSettings: (settings: unknown) => setLoginItemSettings(settings),
    },
}));

beforeEach(() => {
    Object.defineProperty(process, "platform", { value: "linux" });
    vi.stubEnv("APPIMAGE", "/home/me/My Apps/WorkAdventure.AppImage");
    fs.rmSync(file, { force: true });
});

test("a fresh install starts at login, from the AppImage file itself", async () => {
    const { initStartAtLogin, isStartAtLoginEnabled } = await import("./auto-launch");
    initStartAtLogin(true);
    expect(fs.readFileSync(file, "utf8")).toContain(
        '\nExec="/home/me/My Apps/WorkAdventure.AppImage" --start-in-background\n'
    );
    expect(isStartAtLoginEnabled()).toBe(true);
});

test("later launches keep what the user chose, and refresh the path of an enabled entry", async () => {
    const { initStartAtLogin } = await import("./auto-launch");
    initStartAtLogin(false);
    expect(fs.existsSync(file)).toBe(false);

    // An entry pointing at where the AppImage used to be.
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, "[Desktop Entry]\nExec=/home/me/Downloads/WorkAdventure-2.0.0.AppImage\n");
    initStartAtLogin(false);
    expect(fs.readFileSync(file, "utf8")).toContain(
        '\nExec="/home/me/My Apps/WorkAdventure.AppImage" --start-in-background\n'
    );
});

test("an entry turned off in the desktop's settings stays off", async () => {
    const { initStartAtLogin, isStartAtLoginEnabled } = await import("./auto-launch");
    fs.mkdirSync(path.dirname(file), { recursive: true });
    for (const off of ["Hidden=true", "X-GNOME-Autostart-enabled=false"]) {
        const entry = `[Desktop Entry]\nExec=/old/path\n${off}\n`;
        fs.writeFileSync(file, entry);
        initStartAtLogin(false);
        expect(isStartAtLoginEnabled()).toBe(false);
        expect(fs.readFileSync(file, "utf8")).toBe(entry);
    }
});

test("turning it off removes the entry; paths are escaped as the Desktop Entry spec says", async () => {
    const { setStartAtLogin, writeLinuxAutostart } = await import("./auto-launch");
    // \" \$ \\ inside quotes, every backslash doubled again, %% for %.
    writeLinuxAutostart(true, '/a"b$c%d\\e');
    expect(fs.readFileSync(file, "utf8")).toContain('\nExec="/a\\\\"b\\\\$c%%d\\\\\\\\e" --start-in-background\n');

    setStartAtLogin(false);
    expect(fs.existsSync(file)).toBe(false);
});

test("Windows: an enabled login item gets the background argument again at each start, a disabled one is left alone", async () => {
    Object.defineProperty(process, "platform", { value: "win32" });
    const { initStartAtLogin } = await import("./auto-launch");
    setLoginItemSettings.mockClear();

    loginItem.executableWillLaunchAtLogin = false;
    initStartAtLogin(false);
    expect(setLoginItemSettings).not.toHaveBeenCalled();

    loginItem.executableWillLaunchAtLogin = true;
    initStartAtLogin(false);
    expect(setLoginItemSettings).toHaveBeenCalledWith({ openAtLogin: true, args: ["--start-in-background"] });
});

test("only a start with the background argument counts as a login start (outside macOS)", async () => {
    const { startedAtLogin } = await import("./auto-launch");
    const argv = process.argv;
    try {
        process.argv = ["/opt/WorkAdventure/workadventure"];
        expect(startedAtLogin()).toBe(false);
        process.argv = ["/opt/WorkAdventure/workadventure", "--start-in-background"];
        expect(startedAtLogin()).toBe(true);
    } finally {
        process.argv = argv;
    }
});
