import { app, dialog } from "electron";
import ElectronLog from "electron-log";
import type { DesktopWindowMode, DesktopWindowModeState } from "@workadventure/desktop-api";
import settings from "./settings";
import { t } from "./i18n";
import {
    X11_RESTART_ARG,
    restartArgs,
    startupWindowModeAction,
    windowModeApplies,
    windowModeState,
} from "./window-mode-policy";

/** Linux under Wayland: the window mode setting (window-mode-policy), its restart and its startup check. */

export const windowModeAvailable = windowModeApplies(process.platform, process.env);

export function getWindowModeState(): DesktopWindowModeState {
    return windowModeState({
        saved: settings.get("window_mode") ?? "x11",
        argv: process.argv,
        env: process.env,
        packaged: app.isPackaged,
    });
}

const listeners = new Set<() => void>();

export function onWindowModeChange(listener: () => void) {
    listeners.add(listener);
}

export function setWindowMode(mode: DesktopWindowMode): DesktopWindowModeState {
    settings.set("window_mode", mode);
    listeners.forEach((listener) => listener());
    return getWindowModeState();
}

function relaunch(inX11: boolean): void {
    // An AppImage runs from a mount that goes away with this process: restart the AppImage itself.
    app.relaunch({ execPath: process.env.APPIMAGE || process.execPath, args: restartArgs(process.argv, inX11) });
}

/** Restarts the app, which then starts in the saved mode. */
export function restartToApplyWindowMode(): void {
    relaunch(false);
    app.quit();
}

/**
 * Right after the settings load, before anything else starts. Resolves with true when the app is
 * restarting in X11 mode, in which case startup must stop here.
 */
export async function applyWindowModeAtStartup(): Promise<boolean> {
    if (!windowModeAvailable) {
        return false;
    }
    const x11StartPending = settings.get("x11_start_pending") === true;
    const action = startupWindowModeAction({
        applies: true,
        state: getWindowModeState(),
        argv: process.argv,
        x11StartPending,
    });
    if (action === "restart-in-x11") {
        settings.set("x11_start_pending", true);
        await settings.flush();
        ElectronLog.info("Restarting in compatibility mode (X11).");
        relaunch(true);
        app.exit(0);
        return true;
    }
    if (x11StartPending) {
        settings.set("x11_start_pending", false);
    }
    // ponytail: a second launch racing the X11 restart reads its pending flag and falls back to
    // Wayland; a start timestamp instead of a flag would tell them apart.
    if (action === "x11-failed") {
        ElectronLog.warn("The last start in compatibility mode (X11) failed: staying in Wayland mode.");
        settings.set("window_mode", "wayland");
        void dialog.showMessageBox({ type: "warning", message: t("windowMode.x11Failed") });
    } else if (process.argv.includes(X11_RESTART_ARG)) {
        ElectronLog.info("Running in compatibility mode (X11).");
    }
    return false;
}

/** The tray's choice: saves it, then offers the restart with what the mode changes. */
export async function chooseWindowModeFromTray(mode: DesktopWindowMode): Promise<void> {
    if (!setWindowMode(mode).restartNeeded) {
        return;
    }
    const { response } = await dialog.showMessageBox({
        type: "question",
        message: t("windowMode.restartQuestion"),
        detail: t(mode === "x11" ? "windowMode.x11Detail" : "windowMode.waylandDetail"),
        buttons: [t("windowMode.restartNow"), t("windowMode.later")],
        defaultId: 0,
        cancelId: 1,
    });
    if (response === 0) {
        restartToApplyWindowMode();
    }
}
