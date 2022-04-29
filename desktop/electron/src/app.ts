import { app, BrowserWindow, globalShortcut } from "electron";

import { createWindow, getWindow } from "./window";
import { createTray } from "./tray";
import autoUpdater from "./auto-updater";
import { updateAutoLaunch } from "./auto-launch";
import ipc from "./ipc";
import settings from "./settings";
import { setLogLevel } from "./log";
import "./serve"; // prepare custom url scheme
import { loadShortcuts } from "./shortcuts";

async function init() {
    const appLock = app.requestSingleInstanceLock();

    if (!appLock) {
        console.log("Application already running");
        app.quit();
        return;
    }

    app.on("second-instance", () => {
        // re-create window if closed
        void createWindow();

        const mainWindow = getWindow();

        // Someone tried to run a second instance, we should focus our window.
        if (mainWindow) {
            if (mainWindow.isMinimized()) {
                mainWindow.restore();
            }

            mainWindow.focus();
        }
    });

    // This method will be called when Electron has finished loading
    await app.whenReady().then(async () => {
        await settings.init();

        setLogLevel(settings.get("log_level") || "info");

        await autoUpdater.init();

        // enable auto launch
        await updateAutoLaunch();

        // load ipc handler
        ipc();

        // Don't show the app in the doc
        // if (app.dock) {
        //   app.dock.hide();
        // }

        await createWindow();
        createTray();

        loadShortcuts();
    });

    // Quit when all windows are closed.
    app.on("window-all-closed", () => {
        // macOs users have to press Cmd + Q to stop the app
        if (process.platform !== "darwin") {
            app.quit();
        }
    });

    app.on("activate", () => {
        // On macOS it's common to re-create a window in the app when the
        // dock icon is clicked and there are no other windows open.
        if (BrowserWindow.getAllWindows().length === 0) {
            void createWindow();
        }
    });

    app.on("quit", () => {
        // TODO
    });

    app.on("will-quit", () => {
        globalShortcut.unregisterAll();
    });
}

export default {
    init,
};
