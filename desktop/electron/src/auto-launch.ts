import fs from "node:fs";
import path from "node:path";
import { app } from "electron";

// Start at login. The system holds the setting, not settings.json: turning WorkAdventure off in the
// system's own startup settings (Login Items, Task Manager, the desktop's autostart) then sticks, and
// the switches in the settings window and in WorkAdventure always show what will happen at the next login.
//
// A login start keeps the window in the tray (see createWindow): the user did not ask for WorkAdventure,
// so it does not take the screen and the focus. Windows and Linux tell it with BACKGROUND_START_ARG on
// the login item, macOS with `wasOpenedAtLogin`.
//
// Not the macOS hidden login item (`openAsHidden`): Electron deprecated it and macOS 13+ ignores it. A
// hidden window gets no animation frames, but the world still boots: the front clocks Phaser's loop by
// hand until it is in the world (BackgroundBootPump in play).

const LINUX_AUTOSTART_FILE = "workadventure.desktop";

/** On the login item of Windows and Linux: the system started the app, not the user. */
export const BACKGROUND_START_ARG = "--start-in-background";

/** Whether the system started the app at login, rather than the user. */
export function startedAtLogin(): boolean {
    if (process.argv.includes(BACKGROUND_START_ARG)) {
        return true;
    }
    return process.platform === "darwin" && app.getLoginItemSettings().wasOpenedAtLogin;
}

/** At startup: on for a fresh install (`turnOn`), otherwise left as the user set it, here or in the system. */
export function initStartAtLogin(turnOn: boolean) {
    if (turnOn) {
        setStartAtLogin(true);
    } else if (process.platform !== "darwin" && isStartAtLoginEnabled()) {
        // Rewritten with the current path (an AppImage can move) and BACKGROUND_START_ARG, which older
        // versions did not put on the login item.
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
        // `setLoginItemSettings` doesn't support linux. macOS ignores `args`.
        app.setLoginItemSettings({ openAtLogin: enabled, args: [BACKGROUND_START_ARG] });
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
    fs.writeFileSync(
        file,
        `[Desktop Entry]\nType=Application\nName=WorkAdventure\nExec=${exec} ${BACKGROUND_START_ARG}\nTerminal=false\n`
    );
}

function linuxAutostartFile() {
    return path.join(app.getPath("appData"), "autostart", LINUX_AUTOSTART_FILE);
}
