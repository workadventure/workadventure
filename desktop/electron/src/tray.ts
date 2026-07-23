import { app, clipboard, nativeImage, Tray, Menu, type NativeImage } from "electron";
import ElectronLog from "electron-log";
import path from "path";
import { showAboutWindow } from "electron-util";

import * as autoUpdater from "./auto-updater";
import * as log from "./log";
import settings from "./settings";
import { getWindow, loadDesktopTarget } from "./window";
import { emitCameraToggle, emitMuteToggle, emitSetStatus } from "./ipc";
import { createPinnedWorldMenuItems, createRecentWorldMenuItems, openNativeWorldSwitcher } from "./native-menu";
import { onWorldHistoryChange } from "./world-history";
import {
    getAvailabilityInfo,
    getMediaState,
    getTrayStatus,
    onPresenceChange,
    type TrayAvailability,
    type TrayStatus,
} from "./presence";
import { isCompanionVisible, toggleCompanion } from "./companion-controller";
import { stripSensitiveQueryParams } from "./desktop-url-policy";

let tray: Tray | undefined;

const assetsDirectory = path.join(__dirname, "..", "assets");

// Status-dot colors composited onto the tray glyph, mirroring WA's status dots: green = online,
// orange = be-right-back / idle, red = busy / do-not-disturb / in a meeting.
const TRAY_STATUS_COLOR: Record<TrayStatus, string> = {
    meeting: "#E24B4A",
    do_not_disturb: "#E24B4A",
    busy: "#E24B4A",
    back_in_a_moment: "#F5A623",
    idle: "#F5A623",
    online: "#2ECC71",
};

const TRAY_STATUS_LABEL: Record<TrayStatus, string> = {
    meeting: "🔴 In a meeting",
    do_not_disturb: "⛔ Do not disturb",
    busy: "🔴 Busy",
    back_in_a_moment: "🟠 Be right back",
    idle: "🟡 Idle",
    online: "🟢 Available",
};

// The four user-selectable availability statuses, in display order. Colors mirror WA's status dots.
const AVAILABILITY_ITEMS: ReadonlyArray<{ status: TrayAvailability; label: string }> = [
    { status: "online", label: "🟢 Available" },
    { status: "busy", label: "🔴 Busy" },
    { status: "back_in_a_moment", label: "🟠 Be right back" },
    { status: "do_not_disturb", label: "⛔ Do not disturb" },
];

function buildStatusSubmenuItems(): Electron.MenuItemConstructorOptions[] {
    const { status, locked } = getAvailabilityInfo();
    if (locked) {
        // WA locks the status bar in a meeting / silent zone; mirror that so we don't fight it.
        return [{ label: "Locked while in a meeting", enabled: false }];
    }
    return AVAILABILITY_ITEMS.map((item) => ({
        label: item.label,
        type: "radio" as const,
        checked: status === item.status,
        click() {
            emitSetStatus(item.status);
        },
    }));
}

// Logical tray icon size in points; a matching @2x representation is added for Retina crispness.
// Keep this at the macOS menu-bar glyph size (~18pt) — the image is a non-template colored icon, so
// macOS renders it at its point size (it does not auto-fit to the bar height). A larger value makes
// the icon overflow the ~22pt menu bar and read as an oversized blob next to the system icons.
const TRAY_ICON_SIZE = 18;
const trayIconCache = new Map<TrayStatus, NativeImage>();
const baseTrayImageByPixelSize = new Map<number, NativeImage>();

function hexToRgb(hex: string): { r: number; g: number; b: number } {
    const value = hex.replace("#", "");
    return {
        r: parseInt(value.slice(0, 2), 16),
        g: parseInt(value.slice(2, 4), 16),
        b: parseInt(value.slice(4, 6), 16),
    };
}

function getBaseTrayImage(pixelSize: number): NativeImage | undefined {
    const cached = baseTrayImageByPixelSize.get(pixelSize);
    if (cached) {
        return cached;
    }
    const resized = nativeImage
        .createFromPath(path.join(assetsDirectory, "icons", "logo.png"))
        .resize({ width: pixelSize, height: pixelSize });
    if (!resized.getSize().width) {
        return undefined;
    }
    baseTrayImageByPixelSize.set(pixelSize, resized);
    return resized;
}

/**
 * Composite a colored status dot onto a `pixelSize`×`pixelSize` copy of the logo and return the
 * BGRA buffer. Done pixel-wise on the toBitmap() buffer rather than via an SVG data URL, because
 * nativeImage.createFromDataURL does NOT reliably rasterize SVG across platforms — a bitmap
 * round-trip always works. The dot geometry scales with pixelSize so the 1x and 2x reps match.
 */
function compositeStatusDotBuffer(status: TrayStatus, pixelSize: number): Buffer | undefined {
    const base = getBaseTrayImage(pixelSize);
    if (!base) {
        return undefined;
    }
    const buffer = Buffer.from(base.toBitmap());
    const { width, height } = base.getSize();
    const { r, g, b } = hexToRgb(TRAY_STATUS_COLOR[status]);
    const radius = Math.max(3, Math.round(Math.min(width, height) * 0.3));
    const cx = width - radius - 1;
    const cy = height - radius - 1;
    const ring = Math.max(1, pixelSize / TRAY_ICON_SIZE * 1.5);

    for (let y = Math.max(0, cy - radius - 2); y < Math.min(height, cy + radius + 2); y++) {
        for (let x = Math.max(0, cx - radius - 2); x < Math.min(width, cx + radius + 2); x++) {
            const dist = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2);
            const idx = (y * width + x) * 4;
            // toBitmap yields BGRA.
            if (dist <= radius) {
                buffer[idx] = b;
                buffer[idx + 1] = g;
                buffer[idx + 2] = r;
                buffer[idx + 3] = 255;
            } else if (dist <= radius + ring) {
                // White ring so the dot reads against a dark logo / dark menubar.
                buffer[idx] = 255;
                buffer[idx + 1] = 255;
                buffer[idx + 2] = 255;
                buffer[idx + 3] = 255;
            }
        }
    }
    return buffer;
}

/**
 * Build the tray image for a status as a non-template colored bitmap (a template image would
 * flatten the colored dot to monochrome), with a @2x representation so the glyph stays crisp on
 * Retina menu bars. Cached per status.
 */
function drawTrayStatusImage(status: TrayStatus): NativeImage {
    const cached = trayIconCache.get(status);
    if (cached) {
        return cached;
    }

    try {
        const buffer1x = compositeStatusDotBuffer(status, TRAY_ICON_SIZE);
        if (!buffer1x) {
            throw new Error("logo bitmap unavailable");
        }
        const image = nativeImage.createFromBitmap(buffer1x, { width: TRAY_ICON_SIZE, height: TRAY_ICON_SIZE });

        const buffer2x = compositeStatusDotBuffer(status, TRAY_ICON_SIZE * 2);
        if (buffer2x) {
            image.addRepresentation({
                scaleFactor: 2,
                width: TRAY_ICON_SIZE * 2,
                height: TRAY_ICON_SIZE * 2,
                buffer: buffer2x,
            });
        }

        trayIconCache.set(status, image);
        return image;
    } catch (error) {
        ElectronLog.warn(`Failed to composite tray status dot for "${status}"`, error);
        // Fall back to the plain logo (never leave the tray without an icon).
        return getBaseTrayImage(TRAY_ICON_SIZE) ?? nativeImage.createFromPath(path.join(assetsDirectory, "icons", "logo.png"));
    }
}

function copyCurrentWorldUrl(): void {
    const safe = stripSensitiveQueryParams(settings.get("last_room_url"));
    if (safe) {
        clipboard.writeText(safe);
    }
}

function updateTrayContextMenu() {
    if (!tray) {
        return;
    }

    const status = getTrayStatus();
    const media = getMediaState();
    const shortcuts = settings.get("shortcuts");
    const lastRoomUrl = settings.get("last_room_url");

    const trayContextMenu = Menu.buildFromTemplate([
        {
            label: TRAY_STATUS_LABEL[status],
            enabled: false,
        },
        {
            label: "Set status",
            submenu: buildStatusSubmenuItems(),
        },
        { type: "separator" },
        {
            id: "microphone",
            label: "Microphone",
            type: "checkbox",
            checked: media.micEnabled,
            // Display-only accelerator: the real binding stays in shortcuts.ts (globalShortcut).
            accelerator: shortcuts?.mute_toggle || undefined,
            click() {
                emitMuteToggle();
            },
        },
        {
            id: "camera",
            label: "Camera",
            type: "checkbox",
            checked: media.cameraEnabled,
            accelerator: shortcuts?.camera_toggle || undefined,
            click() {
                emitCameraToggle();
            },
        },
        {
            label: "Copy current world URL",
            enabled: Boolean(lastRoomUrl),
            click: copyCurrentWorldUrl,
        },
        {
            label: "Companion panel",
            type: "checkbox",
            checked: isCompanionVisible(),
            click() {
                toggleCompanion();
            },
        },
        { type: "separator" },
        {
            id: "open",
            label: "Show / Hide",
            click() {
                const mainWindow = getWindow();
                if (!mainWindow) {
                    throw new Error("Main window not found");
                }

                if (mainWindow.isVisible()) {
                    mainWindow.hide();
                } else {
                    mainWindow.show();
                }
            },
        },
        {
            label: "Change world…",
            click: openNativeWorldSwitcher,
        },
        {
            label: "Pinned worlds",
            submenu: createPinnedWorldMenuItems(),
        },
        {
            label: "Recent worlds",
            submenu: createRecentWorldMenuItems(),
        },
        { type: "separator" },
        {
            label: "Check for updates",
            click() {
                void autoUpdater.manualRequestUpdateCheck();
            },
        },
        {
            label: "Open Logs",
            click() {
                void log.openLog();
            },
        },
        {
            label: "Open Portal",
            click() {
                void loadDesktopTarget(settings.get("portal_url"));
            },
        },
        { type: "separator" },
        {
            label: "About",
            click() {
                showAboutWindow({
                    icon: path.join(assetsDirectory, "icons", "logo.png"),
                    copyright: "Copyright © WorkAdventure",
                });
            },
        },
        {
            label: "Quit",
            click() {
                // app.confirmedExitPrompt = true;
                app.quit();
            },
        },
    ]);

    tray.setContextMenu(trayContextMenu);
}

function updateTrayIcon() {
    if (!tray) {
        return;
    }
    const status = getTrayStatus();
    tray.setImage(drawTrayStatusImage(status));
    tray.setToolTip(`WorkAdventure — ${TRAY_STATUS_LABEL[status].replace(/^\S+\s/, "")}`);
}

export function getTray() {
    return tray;
}

export function createTray() {
    tray = new Tray(drawTrayStatusImage(getTrayStatus()));
    updateTrayIcon();
    updateTrayContextMenu();
    onWorldHistoryChange(updateTrayContextMenu);
    // Presence (meeting / mic / camera / idle) drives both the status dot and the quick-action
    // checkmarks, so rebuild both on every change.
    onPresenceChange(() => {
        updateTrayIcon();
        updateTrayContextMenu();
    });

    tray.on("double-click", () => {
        const mainWindow = getWindow();
        if (!mainWindow) {
            throw new Error("Main window not found");
        }

        mainWindow.show();
    });
}
