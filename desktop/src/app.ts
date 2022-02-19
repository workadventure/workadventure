import { app, BrowserWindow, globalShortcut } from "electron";

import { createWindow, getWindow } from "./window";
import { createTray } from "./tray";
import autoUpdater from "./auto-updater";
import updateAutoLaunch from "./update-auto-launch";
import ipc, { emitMutedKeyPress } from "./ipc";
import settings from "./settings";
import { setLogLevel } from "./log";

function init() {
    const appLock = app.requestSingleInstanceLock();

    if (!appLock) {
        console.log("Application already running");
        app.quit();
        return;
    }

    app.on("second-instance", () => {
        // re-create window if closed
        createWindow();

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
    app.on("ready", async () => {
        await settings.init();

        const logLevel = settings.get("log_level");
        setLogLevel(logLevel || "info");

        autoUpdater.init();

        // enable auto launch
        updateAutoLaunch();

        // Don't show the app in the doc
        // if (app.dock) {
        //   app.dock.hide();
        // }

        createWindow();
        createTray();

        // load ipc handler
        ipc();

        globalShortcut.register("Alt+CommandOrControl+M", () => {
            emitMutedKeyPress();
        });
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
            createWindow();
        }
    });

    app.on("quit", () => {
        // TODO
    });
}

export default {
    init,
};
