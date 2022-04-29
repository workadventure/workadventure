import { app, Tray, Menu } from "electron";
import path from "path";
import { showAboutWindow } from "electron-util";

import * as autoUpdater from "./auto-updater";
import * as log from "./log";
import { getAppView, getWindow } from "./window";

let tray: Tray | undefined;

const assetsDirectory = path.join(__dirname, "..", "assets");

export function getTray() {
    return tray;
}

export function createTray() {
    tray = new Tray(path.join(assetsDirectory, "icons", "logo.png"));

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
            label: "Open DevTools",
            click() {
                getWindow()?.webContents.openDevTools({ mode: "detach" });
                getAppView()?.webContents.openDevTools({ mode: "detach" });
            },
        },
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

    tray.on("double-click", () => {
        const mainWindow = getWindow();
        if (!mainWindow) {
            throw new Error("Main window not found");
        }

        mainWindow.show();
    });
}
