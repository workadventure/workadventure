import { app, dialog, type MessageBoxOptions } from "electron";
import { autoUpdater } from "electron-updater";
import log from "electron-log";
import * as util from "util";

import { isStartAtLoginEnabled, writeLinuxAutostart } from "./auto-launch";
import { createAndShowNotification } from "./notification";
import { createDesktopConfig } from "./desktop-url-policy";
import { t } from "./i18n";

const sleep = util.promisify(setTimeout);

let isCheckPending = false;
let isManualRequestedUpdate = false;

export async function checkForUpdates() {
    if (isCheckPending) {
        return;
    }

    // Don't do auto-updates in development
    if (!app.isPackaged) {
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
        body: t("update.checking"),
    });

    await checkForUpdates();
    isManualRequestedUpdate = false;
}

async function init() {
    // In dev (electron .) there is no release to compare with, and a failed check pops the
    // unhandledRejection dialog that blocks the boot. Skip entirely in dev.
    if (!app.isPackaged) {
        log.info("Auto-updater disabled in development.");
        return;
    }

    autoUpdater.logger = log;
    // Every user is offered the latest release; an organization can point its installs elsewhere.
    const feedUrl = createDesktopConfig().updateFeedUrl;
    if (feedUrl) {
        autoUpdater.setFeedURL({ provider: "generic", url: feedUrl });
    }

    autoUpdater.on("update-downloaded", ({ releaseNotes, releaseName }) => {
        void (async () => {
            // Either may be missing, and the notes are a list when fullChangelog is on.
            const text = process.platform === "win32" ? releaseNotes : releaseName;
            const dialogOpts: MessageBoxOptions = {
                type: "question",
                buttons: [t("update.installAndRestart"), t("update.installLater")],
                defaultId: 0,
                title: t("update.title"),
                message: typeof text === "string" ? text : t("update.title"),
                detail: t("update.ready"),
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
    });

    // Our AppImage names carry the version, so installing an update moves the app to a new file.
    autoUpdater.on("appimage-filename-updated", (newPath) => {
        if (isStartAtLoginEnabled()) {
            writeLinuxAutostart(true, newPath);
        }
    });

    if (process.platform === "linux" && !process.env.APPIMAGE) {
        autoUpdater.autoDownload = false;
        autoUpdater.autoInstallOnAppQuit = false;

        autoUpdater.on("update-available", () => {
            createAndShowNotification({
                title: t("update.availableTitle"),
                body: t("update.availableBody"),
            });
        });
    }

    autoUpdater.on("update-not-available", () => {
        if (isManualRequestedUpdate) {
            createAndShowNotification({
                body: t("update.none"),
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
