import { app, nativeImage, Tray, Menu, type NativeImage } from "electron";

import settings from "./settings";
import { createWindow, getWindow } from "./window";
import { emitCameraToggle, emitMuteToggle } from "./ipc";
import { createPinnedWorldMenuItems, createRecentWorldMenuItems, openNativeWorldSwitcher } from "./native-menu";
import { onWorldHistoryChange } from "./world-history";
import { getMediaState, getTrayStatus, onPresenceChange, type TrayStatus } from "./presence";
import { isMiniWindowVisible, toggleMiniWindow } from "./mini-window-controller";
import { t } from "./i18n";
import { onShortcutsChange } from "./shortcuts";
import { openSettingsWindow } from "./settings-window";
import { TRAY_ICON_SIZE, renderTrayIcon } from "./tray-icon";

let tray: Tray | undefined;

const TRAY_STATUS_EMOJI: Record<TrayStatus, string> = {
    meeting: "🔴",
    do_not_disturb: "⛔",
    busy: "🟡",
    back_in_a_moment: "🔵",
    idle: "🟡",
    online: "🟢",
    offline: "⚪",
};

function trayStatusLabel(status: TrayStatus): string {
    return `${TRAY_STATUS_EMOJI[status]} ${t(`tray.status.${status}`)}`;
}

const trayIconCache = new Map<TrayStatus, NativeImage>();

/**
 * Build the tray image for a status as a non-template colored bitmap (a template image would
 * flatten the colored dot to monochrome), with a @2x representation so the glyph stays crisp on
 * Retina menu bars. Cached per status.
 */
function drawTrayStatusImage(status: TrayStatus): NativeImage {
    let image = trayIconCache.get(status);
    if (!image) {
        image = nativeImage.createFromBitmap(renderTrayIcon(status, 1), {
            width: TRAY_ICON_SIZE,
            height: TRAY_ICON_SIZE,
        });
        image.addRepresentation({
            scaleFactor: 2,
            width: TRAY_ICON_SIZE * 2,
            height: TRAY_ICON_SIZE * 2,
            buffer: renderTrayIcon(status, 2),
        });
        trayIconCache.set(status, image);
    }
    return image;
}

/**
 * Status, microphone, camera and mini window: what is worth reaching for with the window hidden. The
 * tray's menu starts with them, and so does the Dock icon's menu (macOS).
 */
function quickActionMenuItems(): Electron.MenuItemConstructorOptions[] {
    const status = getTrayStatus();
    // Status / mic / camera / mini window only make sense inside a world; gray them out otherwise
    // (landing / login, or no window). "offline" is exactly the not-in-a-world state.
    const inWorld = status !== "offline";
    const media = getMediaState();
    const shortcuts = settings.get("shortcuts");
    return [
        {
            // Reports the live status; it is changed in WorkAdventure or the mini window.
            label: trayStatusLabel(status),
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
    const status = getTrayStatus();
    tray.setImage(drawTrayStatusImage(status));
    tray.setToolTip(`WorkAdventure — ${t(`tray.status.${status}`)}`);
}

export function getTray() {
    return tray;
}

export function createTray() {
    tray = new Tray(drawTrayStatusImage(getTrayStatus()));
    updateTrayIcon();
    updateTrayContextMenu();
    onWorldHistoryChange(updateTrayContextMenu);
    // The microphone and camera items show their shortcuts.
    onShortcutsChange(updateTrayContextMenu);
    // Presence (meeting / mic / camera / idle) drives both the status dot and the quick-action
    // checkmarks, so rebuild both on every change.
    onPresenceChange(() => {
        updateTrayIcon();
        updateTrayContextMenu();
    });

    tray.on("double-click", () => {
        const mainWindow = getWindow();
        if (!mainWindow || mainWindow.isDestroyed()) {
            void createWindow();
            return;
        }

        mainWindow.show();
    });
}
