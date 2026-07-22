import { app, clipboard, nativeImage, Tray, Menu, type NativeImage } from "electron";
import ElectronLog from "electron-log";
import path from "path";
import { showAboutWindow } from "electron-util";

import * as autoUpdater from "./auto-updater";
import * as log from "./log";
import settings from "./settings";
import { getWindow, loadDesktopTarget } from "./window";
import { emitCameraToggle, emitMuteToggle } from "./ipc";
import { createRecentWorldMenuItems, openNativeWorldSwitcher } from "./native-menu";
import { onWorldHistoryChange } from "./world-history";
import { getMediaState, getTrayStatus, onPresenceChange, type TrayStatus } from "./presence";
import { stripSensitiveQueryParams } from "./desktop-url-policy";

let tray: Tray | undefined;

const assetsDirectory = path.join(__dirname, "..", "assets");

// Status-dot colors composited onto the tray glyph. Meeting reuses the unread-badge red.
const TRAY_STATUS_COLOR: Record<TrayStatus, string> = {
    meeting: "#E24B4A",
    idle: "#F5A623",
    available: "#2ECC71",
};

const TRAY_STATUS_LABEL: Record<TrayStatus, string> = {
    meeting: "🔴 In a meeting",
    idle: "🟡 Idle",
    available: "🟢 Available",
};

const TRAY_ICON_SIZE = 32;
const trayIconCache = new Map<TrayStatus, NativeImage>();
let baseTrayImage: NativeImage | undefined;

function hexToRgb(hex: string): { r: number; g: number; b: number } {
    const value = hex.replace("#", "");
    return {
        r: parseInt(value.slice(0, 2), 16),
        g: parseInt(value.slice(2, 4), 16),
        b: parseInt(value.slice(4, 6), 16),
    };
}

/**
 * Composite a colored status dot onto the (resized) logo bitmap. Done pixel-wise on the BGRA
 * buffer from toBitmap() rather than via an SVG data URL, because nativeImage.createFromDataURL
 * does NOT reliably rasterize SVG across platforms — a bitmap round-trip always works. Stays a
 * non-template image (a template image would flatten the colored dot to monochrome).
 */
function drawTrayStatusImage(status: TrayStatus): NativeImage {
    const cached = trayIconCache.get(status);
    if (cached) {
        return cached;
    }

    if (!baseTrayImage) {
        baseTrayImage = nativeImage
            .createFromPath(path.join(assetsDirectory, "icons", "logo.png"))
            .resize({ width: TRAY_ICON_SIZE, height: TRAY_ICON_SIZE });
    }

    // If the logo somehow failed to load, fall back to the raw glyph without a dot.
    const size = baseTrayImage.getSize();
    if (!size.width || !size.height) {
        return baseTrayImage;
    }

    try {
        const buffer = Buffer.from(baseTrayImage.toBitmap());
        const { width, height } = size;
        const { r, g, b } = hexToRgb(TRAY_STATUS_COLOR[status]);
        const radius = Math.max(3, Math.round(Math.min(width, height) * 0.3));
        const cx = width - radius - 1;
        const cy = height - radius - 1;
        const ring = 1.5;

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

        const image = nativeImage.createFromBitmap(buffer, { width, height });
        trayIconCache.set(status, image);
        return image;
    } catch (error) {
        ElectronLog.warn(`Failed to composite tray status dot for "${status}"`, error);
        return baseTrayImage;
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
