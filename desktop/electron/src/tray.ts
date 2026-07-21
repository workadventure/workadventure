import { app, Tray, Menu } from "electron";
import path from "path";
import { showAboutWindow } from "electron-util";

import * as autoUpdater from "./auto-updater";
import * as log from "./log";
import settings from "./settings";
import { getWindow, loadDesktopTarget } from "./window";
import { createRecentWorldMenuItems, openNativeWorldSwitcher } from "./native-menu";
import { onWorldHistoryChange } from "./world-history";

let tray: Tray | undefined;

const assetsDirectory = path.join(__dirname, "..", "assets");

function updateTrayContextMenu() {
    if (!tray) {
        return;
    }

    const trayContextMenu = Menu.buildFromTemplate([
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

export function getTray() {
    return tray;
}

export function createTray() {
    tray = new Tray(path.join(assetsDirectory, "icons", "logo.png"));
    updateTrayContextMenu();
    onWorldHistoryChange(updateTrayContextMenu);

    tray.on("double-click", () => {
        const mainWindow = getWindow();
        if (!mainWindow) {
            throw new Error("Main window not found");
        }

        mainWindow.show();
    });
}
