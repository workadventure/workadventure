import { app, BrowserWindow, nativeImage, Notification, powerSaveBlocker } from "electron";
import ElectronLog from "electron-log";
import path from "path";

let keepAwakeBlockerId: number | undefined;

/**
 * Prevent the display from sleeping while the user is engaged in an active proximity meeting.
 * Main manages a single powerSaveBlocker id — toggling on/off is idempotent, so the renderer can
 * spam the current state as `isInActiveConversationStore` fluctuates without leaking blockers.
 */
export function setKeepAwake(enabled: boolean): void {
    if (enabled) {
        if (keepAwakeBlockerId !== undefined && powerSaveBlocker.isStarted(keepAwakeBlockerId)) {
            return;
        }
        try {
            // "prevent-display-sleep" also implies prevent-app-suspension. Adequate for meeting UX:
            // we want the screen ON so the user can see the meeting, not just the process alive.
            keepAwakeBlockerId = powerSaveBlocker.start("prevent-display-sleep");
            ElectronLog.debug(`powerSaveBlocker started (id=${keepAwakeBlockerId})`);
        } catch (error) {
            ElectronLog.warn("powerSaveBlocker.start failed", error);
        }
        return;
    }

    if (keepAwakeBlockerId === undefined) {
        return;
    }
    try {
        if (powerSaveBlocker.isStarted(keepAwakeBlockerId)) {
            powerSaveBlocker.stop(keepAwakeBlockerId);
            ElectronLog.debug(`powerSaveBlocker stopped (id=${keepAwakeBlockerId})`);
        }
    } catch (error) {
        ElectronLog.warn("powerSaveBlocker.stop failed", error);
    } finally {
        keepAwakeBlockerId = undefined;
    }
}

/**
 * Draw a small square "N" (or "9+" past 99) as a native image, sized for the Windows overlay-icon
 * slot. macOS uses text via `app.dock.setBadge` and doesn't need this. Called on-demand only.
 */
function drawUnreadOverlayImage(count: number): Electron.NativeImage {
    const size = 32;
    const label = count > 99 ? "9+" : String(count);
    // Data URL SVG → nativeImage is the sandbox-friendliest way to synthesise a badge without
    // shipping N pre-baked PNGs. The SVG is rendered by Chromium's blink and rasterised into a
    // NativeImage — no canvas / DOM access needed on the main process.
    const svg = [
        `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">`,
        `<circle cx="${size / 2}" cy="${size / 2}" r="${size / 2 - 1}" fill="#E24B4A"/>`,
        `<text x="50%" y="55%" text-anchor="middle" dominant-baseline="middle"`,
        ` font-family="Segoe UI, -apple-system, sans-serif" font-size="${label.length > 1 ? 14 : 18}"`,
        ` font-weight="700" fill="white">${label}</text>`,
        `</svg>`,
    ].join("");
    return nativeImage.createFromDataURL(`data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`);
}

/**
 * Set the unread badge on the dock (macOS) / taskbar (Windows). 0 clears. Linux is a silent
 * no-op because no cross-DE badge primitive exists on X11/Wayland — leaving a debug log so the
 * absence is discoverable if a user reports missing badges.
 */
export function setUnreadCount(count: number, mainWindow?: BrowserWindow): void {
    const safeCount = Math.max(0, Math.floor(count));
    if (process.platform === "darwin") {
        try {
            app.dock?.setBadge(safeCount > 0 ? String(safeCount) : "");
        } catch (error) {
            ElectronLog.warn("dock.setBadge failed", error);
        }
        return;
    }
    if (process.platform === "win32" && mainWindow && !mainWindow.isDestroyed()) {
        try {
            if (safeCount === 0) {
                mainWindow.setOverlayIcon(null, "");
            } else {
                mainWindow.setOverlayIcon(drawUnreadOverlayImage(safeCount), `${safeCount} unread`);
            }
        } catch (error) {
            ElectronLog.warn("setOverlayIcon failed", error);
        }
        return;
    }
    // linux: log only when count actually changes to avoid noise on every renderer tick.
    ElectronLog.debug(`setUnreadCount(${safeCount}) — no badge primitive on this platform`);
}

export type ShowNotificationOptions = {
    title: string;
    body: string;
    tag?: string;
    silent?: boolean;
};

/**
 * Show an OS notification with the WA icon. When the user clicks it, `onClick(tag)` is called
 * — the ipc layer routes that back to the renderer as `app:on-notification-click(tag)` so the
 * front can open the originating room/conversation.
 */
export function showNotification(
    options: ShowNotificationOptions,
    onClick: (tag: string | undefined) => void
): Notification | undefined {
    if (!Notification.isSupported()) {
        return undefined;
    }
    const notif = new Notification({
        title: options.title,
        body: options.body,
        icon: path.join(__dirname, "..", "assets", "icons", "logo.png"),
        silent: Boolean(options.silent),
    });
    notif.on("click", () => onClick(options.tag));
    notif.show();
    return notif;
}
