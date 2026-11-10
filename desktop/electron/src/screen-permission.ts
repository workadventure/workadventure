import { app, desktopCapturer, dialog, shell, systemPreferences } from "electron";
import ElectronLog from "electron-log";
import { t } from "./i18n";
import { getWindow } from "./window";

// System Settings › Privacy & Security › Screen Recording.
const SCREEN_RECORDING_SETTINGS = "x-apple.systempreferences:com.apple.preference.security?Privacy_ScreenCapture";

/**
 * The screen recording permission a share needs, asked by macOS only. macOS reads it when the app
 * starts: granted while the app runs, it only applies after a restart. It does not tell "never asked"
 * from "denied", hence a single "missing" state.
 */
export type ScreenPermission = "granted" | "missing" | "not-needed";

export function screenPermission(): ScreenPermission {
    if (process.platform !== "darwin") {
        return "not-needed";
    }
    return systemPreferences.getMediaAccessStatus("screen") === "granted" ? "granted" : "missing";
}

/**
 * macOS has no request API for screen recording: a capture attempt lists the app in System Settings
 * (with macOS's own prompt the first time), which is then opened on the right pane.
 */
export async function requestScreenPermission(): Promise<ScreenPermission> {
    if (screenPermission() !== "missing") {
        return screenPermission();
    }
    try {
        await desktopCapturer.getSources({ types: ["screen"], thumbnailSize: { width: 0, height: 0 } });
    } catch (error) {
        ElectronLog.warn("Screen recording request failed", error);
    }
    await shell.openExternal(SCREEN_RECORDING_SETTINGS);
    return screenPermission();
}

/**
 * Before a share. Without the permission, macOS hands the app a black or no capture: explain why
 * instead, and offer the settings or the restart that applies a permission just granted.
 */
export async function ensureScreenPermission(): Promise<boolean> {
    if (screenPermission() !== "missing") {
        return true;
    }
    const options = {
        type: "warning" as const,
        message: t("screenPermission.title"),
        detail: t("screenPermission.detail"),
        buttons: [t("screenPermission.openSettings"), t("screenPermission.restart"), t("screenPermission.cancel")],
        defaultId: 0,
        cancelId: 2,
    };
    const window = getWindow();
    const { response } =
        window && !window.isDestroyed()
            ? await dialog.showMessageBox(window, options)
            : await dialog.showMessageBox(options);
    if (response === 0) {
        await requestScreenPermission();
    } else if (response === 1) {
        app.relaunch();
        app.exit(0);
    }
    return false;
}
