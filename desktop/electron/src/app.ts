import path from "path";
import { app, globalShortcut } from "electron";
import ElectronLog from "electron-log";

import { createWindow, getWindow, openDeepLinkTarget } from "./window";
import { getTabs } from "./tab-manager";
import { createTray } from "./tray";
import { startIdleMonitor } from "./idle-monitor";
import { startCompanionController } from "./companion-controller";
import { createNativeApplicationMenu } from "./native-menu";
import autoUpdater from "./auto-updater";
import { updateAutoLaunch } from "./auto-launch";
import ipc from "./ipc";
import settings from "./settings";
import { setLogLevel } from "./log";
import { loadShortcuts } from "./shortcuts";
import { DESKTOP_APP_NAME } from "./app-name-policy";
import { createDefaultProtocolClientArgs } from "./protocol-client-policy";
import { extractDesktopAuthCallback, extractDesktopTargetFromDeepLink } from "./desktop-url-policy";

let pendingProtocolTarget: string | undefined;

app.setName(DESKTOP_APP_NAME);

function getProtocolUrl(argv: string[]) {
    return argv.find((arg) => arg.startsWith("workadventure://"));
}

function queueProtocolUrl(rawUrl?: string) {
    if (!rawUrl) {
        return;
    }

    // Login only completes through the loopback server, which ties the callback to a flow this app
    // started (secret + state). A `workadventure://auth/callback?code=…` link carries no such proof:
    // anyone can craft one with a code for their own account, so it is dropped, never exchanged.
    if (extractDesktopAuthCallback(rawUrl)) {
        ElectronLog.warn("Ignored a workadventure://auth/callback deep link: login only completes via the loopback.");
        return;
    }

    pendingProtocolTarget = extractDesktopTargetFromDeepLink(rawUrl) || pendingProtocolTarget;
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

        // Not awaited: it ends on a network round-trip to the update feed, and at login the network
        // is often not up yet. Awaiting it here delayed the tray, the menu and the window by however
        // long that request took to fail.
        void autoUpdater.init();

        // enable auto launch
        await updateAutoLaunch();

        // load ipc handler
        ipc();

        // In development (unpackaged) the macOS dock shows the default Electron icon — the bundle's
        // .icns is only applied to a packaged .app. Set it explicitly so dev matches the shipped icon.
        if (process.platform === "darwin" && !app.isPackaged) {
            app.dock?.setIcon(path.join(__dirname, "..", "assets", "icons", "logo.png"));
        }

        // Before the window, not after: creating the window awaits the first page load, which is
        // network-bound and has no upper bound. Built afterwards, a slow or hanging load left the
        // app with no tray, no menu and no global shortcuts — nothing to click and nothing to quit
        // with outside the task manager. These only resolve the window lazily, inside their click
        // handlers, so they are safe to build while it does not exist yet.
        createNativeApplicationMenu();
        createTray();
        loadShortcuts();

        const initialProtocolTarget = pendingProtocolTarget;
        pendingProtocolTarget = undefined;
        await createWindow(initialProtocolTarget);

        // Auto-away + notification hush: forward system idle transitions to the renderer, which
        // flips the WA availability to "away" and back. presence.setIdle (called inside) also
        // drives the tray status dot.
        // The shell window has no preload: the worlds live in the tab views, so every tab gets it.
        startIdleMonitor((idle) => {
            for (const tab of getTabs()) {
                if (!tab.view.webContents.isDestroyed()) {
                    tab.view.webContents.send("app:on-system-idle", idle);
                }
            }
        });

        // The unified Companion auto-shows (People / Chat / Controls) whenever the main window is
        // backgrounded in a world; also toggled from the tray + optional global shortcut.
        startCompanionController();
    });

    // Quit when all windows are closed.
    app.on("window-all-closed", () => {
        // macOs users have to press Cmd + Q to stop the app
        if (process.platform !== "darwin") {
            app.quit();
        }
    });

    app.on("activate", () => {
        // On macOS, clicking the dock icon re-creates the window when there is none. It must also
        // reveal an existing-but-hidden one: a hidden window still counts in getAllWindows(), so the
        // old length check made this a no-op and left the dock icon dead. createWindow() already
        // handles both cases — it shows and focuses the current window when one exists.
        void createWindow();
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
