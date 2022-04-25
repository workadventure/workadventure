import { app, dialog } from "electron";
import { autoUpdater } from "electron-updater";
import log from "electron-log";
import * as isDev from "electron-is-dev";
import * as util from "util";

import { createAndShowNotification } from "./notification";

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

    // check for updates right away
    await autoUpdater.checkForUpdates();

    isCheckPending = false;
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
    autoUpdater.logger = log;

    autoUpdater.on(
        "update-downloaded",
        ({ releaseNotes, releaseName }: { releaseNotes: string; releaseName: string }) => {
            void (async () => {
                const dialogOpts = {
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
    setInterval(() => checkForUpdates, 1000 * 60 * 1);
}

export default {
    init,
};
