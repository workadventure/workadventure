import { ipcMain, app, desktopCapturer } from "electron";
import electronIsDev from "electron-is-dev";
import { createAndShowNotification } from "./notification";
import settings from "./settings";
import { loadShortcuts, setShortcutsEnabled } from "./shortcuts";
import { getDesktopWindowState, getWindow, loadDesktopTarget } from "./window";

export function emitMuteToggle() {
    const mainWindow = getWindow();
    if (!mainWindow) {
        throw new Error("Main window not found");
    }

    mainWindow.webContents.send("app:on-mute-toggle");
}

export function emitCameraToggle() {
    const mainWindow = getWindow();
    if (!mainWindow) {
        throw new Error("Main window not found");
    }

    mainWindow.webContents.send("app:on-camera-toggle");
}

export default () => {
    ipcMain.handle("is-development", () => electronIsDev);
    ipcMain.handle("get-version", () => (electronIsDev ? "dev" : app.getVersion()));
    ipcMain.handle("app:getWindowState", () => getDesktopWindowState());

    // app ipc
    ipcMain.on("app:notify", (event, txt: string) => {
        createAndShowNotification({ body: txt });
    });

    ipcMain.handle("app:getDesktopCapturerSources", async (event, options: Electron.SourcesOptions) => {
        return (await desktopCapturer.getSources(options)).map((source) => ({
            id: source.id,
            name: source.name,
            thumbnailURL: source.thumbnail.toDataURL(),
        }));
    });

    ipcMain.handle("app:loadPortal", async () => loadDesktopTarget(settings.get("portal_url")));

    ipcMain.handle("local-app:reloadShortcuts", (event) => loadShortcuts());

    ipcMain.handle("local-app:getSettings", (event) => settings.get() || {});

    ipcMain.handle("local-app:setShortcutsEnabled", (event, enabled: boolean) => setShortcutsEnabled(enabled));
};
