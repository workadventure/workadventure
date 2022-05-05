import { ipcMain, app, desktopCapturer } from "electron";
import electronIsDev from "electron-is-dev";
import { createAndShowNotification } from "./notification";
import { Server } from "./preload-local-app/types";
import settings, { SettingsData } from "./settings";
import { loadShortcuts, setShortcutsEnabled } from "./shortcuts";
import { getAppView, hideAppView, showAppView } from "./window";
// import fetch from "node-fetch";

export function emitMuteToggle() {
    const appView = getAppView();
    if (!appView) {
        throw new Error("Main window not found");
    }

    appView.webContents.send("app:on-mute-toggle");
}

export function emitCameraToggle() {
    const appView = getAppView();
    if (!appView) {
        throw new Error("Main window not found");
    }

    appView.webContents.send("app:on-camera-toggle");
}

export default () => {
    ipcMain.handle("is-development", () => electronIsDev);
    ipcMain.handle("get-version", () => (electronIsDev ? "dev" : app.getVersion()));

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

    // local-app ipc
    ipcMain.handle("local-app:showLocalApp", () => {
        hideAppView();
    });

    ipcMain.handle("local-app:getServers", () => {
        return settings.get("servers");
    });

    ipcMain.handle("local-app:selectServer", async (event, serverId: string) => {
        const servers = settings.get("servers") || [];
        const selectedServer = servers.find((s) => s._id === serverId);

        if (!selectedServer) {
            return new Error("Server not found");
        }

        await showAppView(selectedServer.url);
        return true;
    });

    ipcMain.handle("local-app:addServer", (event, server: Omit<Server, "_id">) => {
        const servers = settings.get("servers") || [];

        // TODO: add proper test to see if server url is valid and points to a real WA server
        // try {
        //
        //     await fetch(`${server.url}/iframe_api.js`);
        // } catch (e) {
        //     console.error(e);
        //     return new Error("Invalid server url");
        // }

        const newServer = {
            ...server,
            _id: `${Date.now()}-${servers.length + 1}`,
        };
        servers.push(newServer);
        settings.set("servers", servers);
        return newServer;
    });

    ipcMain.handle("local-app:removeServer", (event, server: Server) => {
        const servers = settings.get("servers") || [];
        settings.set(
            "servers",
            servers.filter((s) => s._id !== server._id)
        );
        return true;
    });

    ipcMain.handle("local-app:reloadShortcuts", (event) => loadShortcuts());

    ipcMain.handle("local-app:getSettings", (event) => settings.get() || {});
    ipcMain.handle(
        "local-app:saveSetting",
        <T extends keyof SettingsData>(event: Electron.IpcMainInvokeEvent, key: T, value: SettingsData[T]) =>
            settings.set(key, value)
    );

    ipcMain.handle("local-app:setShortcutsEnabled", (event, enabled: boolean) => setShortcutsEnabled(enabled));
};
