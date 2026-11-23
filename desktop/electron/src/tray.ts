import { app, nativeImage, Tray, Menu, type NativeImage } from "electron";
import ElectronLog from "electron-log";
import type { DesktopStatus } from "@workadventure/desktop-api";

import settings from "./settings";
import { createWindow, getWindow } from "./window";
import { emitCameraToggle, emitMuteToggle } from "./ipc";
import { createPinnedWorldMenuItems, createRecentWorldMenuItems, openNativeWorldSwitcher } from "./native-menu";
import { onWorldHistoryChange } from "./world-history";
import { getMediaState, getStatus, onPresenceChange } from "./presence";
import { isMiniWindowVisible, toggleMiniWindow } from "./mini-window-controller";
import { t } from "./i18n";
import { onShortcutsChange } from "./shortcuts";
import { openSettingsWindow } from "./settings-window";
import { OFFLINE_DOT_COLOR, TRAY_ICON_PATH, TRAY_ICON_SIZE, drawStatusDot } from "./tray-icon";
import { detectTray } from "./close-to-tray";

let tray: Tray | undefined;

/** The status the tray shows: the one WorkAdventure shows, or "offline" outside a world. */
function trayStatus(): DesktopStatus {
    return getStatus() ?? { label: t("tray.status.offline"), color: OFFLINE_DOT_COLOR };
}

// The last image drawn. The colors come from the page, so only one is kept.
let trayImage: { color: number; image: NativeImage } | undefined;

/**
 * The tray image for a dot color: the cup, with the status dot drawn over its 1x and 2x pixels. Not a
 * template image, which would flatten the colored dot to monochrome.
 */
function drawTrayStatusImage(color: number): NativeImage {
    if (trayImage?.color !== color) {
        const cup = nativeImage.createFromPath(TRAY_ICON_PATH);
        const image = nativeImage.createEmpty();
        for (const scaleFactor of [1, 2]) {
            const buffer = cup.toBitmap({ scaleFactor });
            drawStatusDot(buffer, scaleFactor, color);
            const size = TRAY_ICON_SIZE * scaleFactor;
            image.addRepresentation({ scaleFactor, width: size, height: size, buffer });
        }
        trayImage = { color, image };
    }
    return trayImage.image;
}

/**
 * Status, microphone, camera and mini window: what is worth reaching for with the window hidden. The
 * tray's menu starts with them, and so does the Dock icon's menu (macOS).
 */
function quickActionMenuItems(): Electron.MenuItemConstructorOptions[] {
    // Mic / camera / mini window only make sense inside a world, which is when there is a status; gray
    // them out otherwise (landing / login, or no window).
    const inWorld = getStatus() !== undefined;
    const media = getMediaState();
    const shortcuts = settings.get("shortcuts");
    return [
        {
            // Reports the live status; it is changed in WorkAdventure or the mini window.
            label: trayStatus().label,
            enabled: false,
        },
        { type: "separator" },
        {
            id: "microphone",
            label: t("tray.microphone"),
            type: "checkbox",
            enabled: inWorld,
            checked: media.micEnabled,
            // Display-only accelerator: the real binding stays in shortcuts.ts (globalShortcut).
            accelerator: shortcuts?.mute_toggle || undefined,
            click() {
                emitMuteToggle();
            },
        },
        {
            id: "camera",
            label: t("tray.camera"),
            type: "checkbox",
            enabled: inWorld,
            checked: media.cameraEnabled,
            accelerator: shortcuts?.camera_toggle || undefined,
            click() {
                emitCameraToggle();
            },
        },
        {
            label: t("tray.miniWindow"),
            type: "checkbox",
            enabled: inWorld,
            checked: isMiniWindowVisible(),
            click() {
                toggleMiniWindow();
            },
        },
    ];
}

function updateTrayContextMenu() {
    // Right-click on the Dock icon: the quick actions, the mini window among them.
    app.dock?.setMenu(Menu.buildFromTemplate(quickActionMenuItems()));
    if (!tray) {
        return;
    }

    // Kept deliberately short and shallow: a menu-bar status item is glanced at mid-meeting, so only the
    // things worth reaching for with a window hidden stay at the top level (status, mic, camera,
    // mini window, show/hide). World switching is real but rare, so it collapses into a submenu, also in
    // the application menu (unreachable while the window is hidden). The rest is in the settings window.
    const trayContextMenu = Menu.buildFromTemplate([
        ...quickActionMenuItems(),
        { type: "separator" },
        {
            id: "open",
            label: t("tray.showHide"),
            click() {
                const mainWindow = getWindow();
                // On macOS, closing the window keeps the app running (window destroyed, no window).
                // Re-create it instead of throwing — the tray is the user's way back in.
                if (!mainWindow || mainWindow.isDestroyed()) {
                    void createWindow();
                    return;
                }

                if (mainWindow.isVisible()) {
                    mainWindow.hide();
                } else {
                    mainWindow.show();
                }
            },
        },
        {
            label: t("tray.rooms"),
            submenu: [
                {
                    label: t("menu.openRoom"),
                    click: openNativeWorldSwitcher,
                },
                { type: "separator" },
                {
                    label: t("menu.pinnedRooms"),
                    submenu: createPinnedWorldMenuItems(),
                },
                {
                    label: t("menu.recentRooms"),
                    submenu: createRecentWorldMenuItems(),
                },
            ],
        },
        { type: "separator" },
        {
            label: t("menu.settings"),
            click: openSettingsWindow,
        },
        {
            label: t("tray.quit"),
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
    const status = trayStatus();
    tray.setImage(drawTrayStatusImage(status.color));
    tray.setToolTip(`WorkAdventure — ${status.label}`);
}

export function getTray() {
    return tray;
}

export function createTray() {
    detectTray();
    tray = new Tray(drawTrayStatusImage(trayStatus().color));
    updateTrayIcon();
    updateTrayContextMenu();
    onWorldHistoryChange(updateTrayContextMenu);
    // The microphone and camera items show their shortcuts.
    onShortcutsChange(updateTrayContextMenu);
    // Presence (status / mic / camera) drives both the status dot and the quick-action
    // checkmarks, so rebuild both on every change.
    onPresenceChange(() => {
        updateTrayIcon();
        updateTrayContextMenu();
    });

    // A click opens the window, as in Teams or Slack: the menu is on right-click (Windows) or where the
    // desktop puts it (Linux, where `click` is an "activation": a left click on KDE). createWindow() shows,
    // restores and focuses the window, or makes it again. Not macOS: a click on a menu-bar icon opens its
    // menu, and the Dock icon reopens the window (`activate`).
    if (process.platform !== "darwin") {
        tray.on("click", () => {
            createWindow().catch((error) => ElectronLog.error("Could not open the window from the tray.", error));
        });
    }
}
