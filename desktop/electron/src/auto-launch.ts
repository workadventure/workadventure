import fs from "node:fs";
import path from "node:path";
import { app } from "electron";

// Start at login. The system holds the setting, not settings.json: turning WorkAdventure off in the
// system's own startup settings (Login Items, Task Manager, the desktop's autostart) then sticks, and
// the switches in the settings window and in WorkAdventure always show what will happen at the next login.
//
// Deliberately NOT a hidden start (no `isHidden` / `openAsHidden`). Two reasons, and the second is the
// blocking one:
//
// Nothing reads `wasOpenedAsHidden`, so the shell shows and focuses the window anyway — the setting
// promised a behaviour the app does not implement.
//
// And implementing it would not work today. `openAsHidden` on macOS hides the *application*, and a
// hidden app gets no animation frames; WorkAdventure's boot runs on Phaser's game loop, so it would
// freeze mid-way and never reach the map. (A window merely created unshown is fine — Chromium still
// renders it — but that is not what a login item does.) Reaching a world in the background needs the
// connection taken out of the render loop, on the front side.

// The name the auto-launch package gave the file (it took the executable's, not ours). Kept so the
// entry it wrote is replaced or removed rather than left behind next to a second one.
const LINUX_AUTOSTART_FILE = "workadventure-desktop.desktop";

/** At startup: on for a fresh install, otherwise left as the user set it, here or in the system. */
export function initStartAtLogin(firstLaunch: boolean) {
    if (firstLaunch) {
        setStartAtLogin(true);
    } else if (process.platform === "linux" && isStartAtLoginEnabled()) {
        // Rewritten with the current path: an AppImage can move, and older versions wrote a temporary one.
        setStartAtLogin(true);
    }
}

export function isStartAtLoginEnabled(): boolean {
    // Never in development: the login item would start the bare Electron binary.
    if (!app.isPackaged) {
        return false;
    }
    if (process.platform === "linux") {
        try {
            const entry = fs.readFileSync(linuxAutostartFile(), "utf8");
            // How desktops turn an autostart entry off without deleting it.
            return !/^(Hidden=true|X-GNOME-Autostart-enabled=false)\s*$/m.test(entry);
        } catch {
            return false;
        }
    }
    const loginItem = app.getLoginItemSettings();
    // Windows keeps openAtLogin true when the app is turned off in Task Manager.
    return process.platform === "win32" ? loginItem.executableWillLaunchAtLogin : loginItem.openAtLogin;
}

export function setStartAtLogin(enabled: boolean) {
    if (!app.isPackaged) {
        return;
    }
    if (process.platform === "linux") {
        // An AppImage runs from a temporary mount that is gone once it quits: start the file itself.
        writeLinuxAutostart(enabled, process.env.APPIMAGE ?? process.execPath);
    } else {
        // `setLoginItemSettings` doesn't support linux
        app.setLoginItemSettings({ openAtLogin: enabled });
    }
}

/** Writes or removes the XDG autostart entry. Synchronous: also called while quitting for an update. */
export function writeLinuxAutostart(enabled: boolean, executable: string) {
    const file = linuxAutostartFile();
    if (!enabled) {
        fs.rmSync(file, { force: true });
        return;
    }
    // Desktop Entry spec: quote the path and escape what is special inside quotes, then escape the
    // backslashes again for the file format itself, and double `%` (field codes).
    const exec = `"${executable.replace(/["`$\\]/g, "\\$&")}"`.replace(/\\/g, "\\\\").replace(/%/g, "%%");
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, `[Desktop Entry]\nType=Application\nName=WorkAdventure\nExec=${exec}\nTerminal=false\n`);
}

function linuxAutostartFile() {
    return path.join(app.getPath("appData"), "autostart", LINUX_AUTOSTART_FILE);
}
