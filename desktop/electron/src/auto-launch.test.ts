import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { beforeEach, expect, test, vi } from "vitest";

// Linux: the XDG autostart entry is the setting itself (no copy in settings.json).
const appData = fs.mkdtempSync(path.join(os.tmpdir(), "wa-autostart-"));
const file = path.join(appData, "autostart", "workadventure-desktop.desktop");
vi.mock("electron", () => ({ app: { getPath: () => appData, isPackaged: true } }));

beforeEach(() => {
    Object.defineProperty(process, "platform", { value: "linux" });
    vi.stubEnv("APPIMAGE", "/home/me/My Apps/WorkAdventure.AppImage");
    fs.rmSync(file, { force: true });
});

test("a fresh install starts at login, from the AppImage file itself", async () => {
    const { initStartAtLogin, isStartAtLoginEnabled } = await import("./auto-launch");
    initStartAtLogin(true);
    expect(fs.readFileSync(file, "utf8")).toContain('\nExec="/home/me/My Apps/WorkAdventure.AppImage"\n');
    expect(isStartAtLoginEnabled()).toBe(true);
});

test("later launches keep what the user chose, and refresh the path of an enabled entry", async () => {
    const { initStartAtLogin } = await import("./auto-launch");
    initStartAtLogin(false);
    expect(fs.existsSync(file)).toBe(false);

    // What the auto-launch package wrote: the AppImage's temporary mount.
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, "[Desktop Entry]\nExec=/tmp/.mount_WorkAdOLD/workadventure-desktop\n");
    initStartAtLogin(false);
    expect(fs.readFileSync(file, "utf8")).toContain('\nExec="/home/me/My Apps/WorkAdventure.AppImage"\n');
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
    expect(fs.readFileSync(file, "utf8")).toContain('\nExec="/a\\\\"b\\\\$c%%d\\\\\\\\e"\n');

    setStartAtLogin(false);
    expect(fs.existsSync(file)).toBe(false);
});
