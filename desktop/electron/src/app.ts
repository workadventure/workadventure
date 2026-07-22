import { app, BrowserWindow, globalShortcut } from "electron";

import { createWindow, getWindow, openDeepLinkTarget } from "./window";
import { createTray } from "./tray";
import { startIdleMonitor } from "./idle-monitor";
import { createNativeApplicationMenu } from "./native-menu";
import autoUpdater from "./auto-updater";
import { updateAutoLaunch } from "./auto-launch";
import ipc from "./ipc";
import settings from "./settings";
import { setLogLevel } from "./log";
import { loadShortcuts } from "./shortcuts";
import { DESKTOP_APP_NAME } from "./app-name-policy";
import { createDefaultProtocolClientArgs } from "./protocol-client-policy";
import {
    extractDesktopAuthCallback,
    extractDesktopTargetFromDeepLink,
    type DesktopAuthCallback,
} from "./desktop-url-policy";

let pendingProtocolTarget: string | DesktopAuthCallback | undefined;

app.setName(DESKTOP_APP_NAME);

function getProtocolUrl(argv: string[]) {
    return argv.find((arg) => arg.startsWith("workadventure://"));
}

function queueProtocolUrl(rawUrl?: string) {
    if (!rawUrl) {
        return;
    }

    pendingProtocolTarget =
        extractDesktopAuthCallback(rawUrl) || extractDesktopTargetFromDeepLink(rawUrl) || pendingProtocolTarget;
}

function registerProtocolHandler() {
    const args = createDefaultProtocolClientArgs({
        defaultApp: Boolean(process.defaultApp),
        argv: process.argv,
        cwd: process.cwd(),
    });
    if (args.length > 0) {
        app.setAsDefaultProtocolClient("workadventure", process.execPath, args);
        return;
    }

    app.setAsDefaultProtocolClient("workadventure");
}

async function init() {
    const appLock = app.requestSingleInstanceLock();

    if (!appLock) {
        console.log("Application already running");
        app.quit();
        return;
    }

    queueProtocolUrl(getProtocolUrl(process.argv));
    registerProtocolHandler();

    app.on("second-instance", (event, argv) => {
        queueProtocolUrl(getProtocolUrl(argv));
        const target = pendingProtocolTarget;
        pendingProtocolTarget = undefined;
        // re-create window if closed
        void openDeepLinkTarget(target);

        const mainWindow = getWindow();

        // Someone tried to run a second instance, we should focus our window.
        if (mainWindow) {
            if (mainWindow.isMinimized()) {
                mainWindow.restore();
            }

            mainWindow.focus();
        }
    });

    app.on("open-url", (event, url) => {
        event.preventDefault();
        queueProtocolUrl(url);
        if (app.isReady()) {
            const target = pendingProtocolTarget;
            pendingProtocolTarget = undefined;
            void openDeepLinkTarget(target);
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

        const initialProtocolTarget = pendingProtocolTarget;
        pendingProtocolTarget = undefined;
        if (typeof initialProtocolTarget === "string") {
            await createWindow(initialProtocolTarget);
        } else {
            await createWindow();
            if (initialProtocolTarget) {
                await openDeepLinkTarget(initialProtocolTarget);
            }
        }
        createNativeApplicationMenu();
        createTray();

        // Auto-away + notification hush: forward system idle transitions to the renderer, which
        // flips the WA availability to "away" and back. presence.setIdle (called inside) also
        // drives the tray status dot.
        startIdleMonitor((idle) => {
            const mainWindow = getWindow();
            if (mainWindow && !mainWindow.webContents.isDestroyed()) {
                mainWindow.webContents.send("app:on-system-idle", idle);
            }
        });

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
