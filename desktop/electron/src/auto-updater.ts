import { app, dialog, type MessageBoxOptions } from "electron";
import { autoUpdater } from "electron-updater";
import log from "electron-log";
import * as isDev from "electron-is-dev";
import * as util from "util";

import { createAndShowNotification } from "./notification";
import { createDesktopConfig } from "./desktop-url-policy";

const sleep = util.promisify(setTimeout);

let isCheckPending = false;
let isManualRequestedUpdate = false;

export async function checkForUpdates() {
    if (isCheckPending) {
        return;
    }

    // Don't do auto-updates in development
    if (isDev) {
        return;
    }

    isCheckPending = true;
    try {
        await autoUpdater.checkForUpdates();
    } catch (error) {
        // Previously the flag was never reset on error, which silently disabled every subsequent
        // check for the lifetime of the process. Always reset in a finally so a transient network
        // failure does not break auto-update forever.
        log.warn("Auto-update check failed.", error);
    } finally {
        isCheckPending = false;
    }
}

export async function manualRequestUpdateCheck() {
    isManualRequestedUpdate = true;

    createAndShowNotification({
        body: "Checking for updates ...",
    });

    await checkForUpdates();
    isManualRequestedUpdate = false;
}

async function init() {
    // In dev (electron .) the app.version is whatever package.json says — often "managedbyci"
    // which electron-updater rejects with ERR_UPDATER_INVALID_VERSION. The unhandledRejection
    // handler then pops a modal dialog that blocks the boot. Skip entirely in dev.
    if (isDev) {
        log.info("Auto-updater disabled in development.");
        return;
    }

    autoUpdater.logger = log;
    autoUpdater.setFeedURL({
        provider: "generic",
        url: createDesktopConfig().updateFeedUrl,
    });

    autoUpdater.on(
        "update-downloaded",
        ({ releaseNotes, releaseName }: { releaseNotes: string; releaseName: string }) => {
            void (async () => {
                const dialogOpts: MessageBoxOptions = {
                    type: "question",
                    buttons: ["Install and Restart", "Install Later"],
                    defaultId: 0,
                    title: "WorkAdventure - Update",
                    message: process.platform === "win32" ? releaseNotes : releaseName,
                    detail: "A new version has been downloaded. Restart the application to apply the updates.",
                };

                const { response } = await dialog.showMessageBox(dialogOpts);
                if (response === 0) {
                    await sleep(1000);

                    autoUpdater.quitAndInstall();

                    // Force app to quit. This is just a workaround, ideally autoUpdater.quitAndInstall() should relaunch the app.
                    // app.confirmedExitPrompt = true;
                    app.quit();
                }
            })();
        }
    );

    if (process.platform === "linux" && !process.env.APPIMAGE) {
        autoUpdater.autoDownload = false;
        autoUpdater.autoInstallOnAppQuit = false;

        autoUpdater.on("update-available", () => {
            createAndShowNotification({
                title: "WorkAdventure - Update available",
                body: "Please go to our website and install the newest version",
            });
        });
    }

    autoUpdater.on("update-not-available", () => {
        if (isManualRequestedUpdate) {
            createAndShowNotification({
                body: "No update available.",
            });
        }
    });

    await checkForUpdates();

    // run update check every hour again
    setInterval(() => {
        void checkForUpdates();
    }, 1000 * 60 * 60);
}

export default {
    init,
};
