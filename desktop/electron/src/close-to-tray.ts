import { execFile } from "child_process";
import { app, autoUpdater, type BrowserWindow } from "electron";
import ElectronLog from "electron-log";
import settings from "./settings";
import { t } from "./i18n";
import { createAndShowNotification } from "./notification";

/**
 * Closing the main window hides it: WorkAdventure keeps running in the tray, and the user stays in their
 * world, reachable, as in other apps that run all day. Quitting is in the tray and the menus.
 */

let quitting = false;
// Every way of quitting goes through before-quit (tray, menus, restarts, updates on Windows and Linux,
// logging out), except an update on macOS: Squirrel closes the windows first, and only says so here.
app.on("before-quit", () => (quitting = true));
autoUpdater.on("before-quit-for-update", () => (quitting = true));

// Linux: GNOME without the AppIndicator extension shows no tray icon, nothing on the session bus hosts
// one. A window closed to a tray that is not there could not be found again, nor the app quit.
let trayShown = process.platform !== "linux";

export function detectTray(): void {
    if (process.platform !== "linux") return;
    execFile(
        "dbus-send",
        [
            "--session",
            "--print-reply",
            "--dest=org.freedesktop.DBus",
            "/org/freedesktop/DBus",
            "org.freedesktop.DBus.NameHasOwner",
            "string:org.kde.StatusNotifierWatcher",
        ],
        { timeout: 3000 },
        (error, stdout) => {
            trayShown = !error && stdout.includes("boolean true");
            ElectronLog.info(`This desktop ${trayShown ? "shows" : "does not show"} tray icons.`);
        }
    );
}

/** Unset, it follows the tray: on where one shows. */
export function closesToTray(): boolean {
    return settings.get("close_to_tray") ?? trayShown;
}

export function setCloseToTray(enabled: boolean): boolean {
    settings.set("close_to_tray", enabled);
    return closesToTray();
}

export function keepRunningOnClose(window: BrowserWindow): void {
    window.on("close", (event) => {
        if (quitting || !closesToTray()) return;
        event.preventDefault();
        // macOS leaves a black screen where a full-screen window was hidden: leave full screen first.
        if (process.platform === "darwin" && window.isFullScreen()) {
            window.once("leave-full-screen", () => window.hide());
            window.setFullScreen(false);
        } else {
            window.hide();
        }
        if (!settings.get("close_to_tray_notified")) {
            settings.set("close_to_tray_notified", true);
            createAndShowNotification({ body: t("closeToTray.stillRunning") });
        }
    });
}
