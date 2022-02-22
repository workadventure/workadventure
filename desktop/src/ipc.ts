import { ipcMain, app } from "electron";
import electronIsDev from "electron-is-dev";
import { createAndShowNotification } from "./notification";
import { Server } from "./preload-local-app/types";
import settings from "./settings";
import { saveShortcut } from "./shortcuts";
import { getWindow, hideAppView, showAppView } from "./window";

export function emitMuteToggle() {
    const mainWindow = getWindow();
    if (!mainWindow) {
        throw new Error("Main window not found");
    }

    mainWindow.webContents.send("app:on-camera-toggle");
}

export function emitCameraToggle() {
    const mainWindow = getWindow();
    if (!mainWindow) {
        throw new Error("Main window not found");
    }

    mainWindow.webContents.send("app:on-mute-toggle");
}

export default () => {
    ipcMain.handle("is-development", () => electronIsDev);
    ipcMain.handle("get-version", () => (electronIsDev ? "dev" : app.getVersion()));

    // app ipc
    ipcMain.on("app:notify", (event, txt) => {
        createAndShowNotification({ body: txt });
    });

    // local-app ipc
    ipcMain.handle("local-app:showLocalApp", () => {
        hideAppView();
    });

    ipcMain.handle("local-app:getServers", () => {
        return (
            settings.get("servers") || [
                // TODO: remove this default server
                {
                    _id: "1",
                    name: "WA Demo",
                    url: "https://play.staging.workadventu.re/@/tcm/workadventure/wa-village",
                },
            ]
        );
    });

    ipcMain.handle("local-app:selectServer", (event, serverId: string) => {
        const servers = settings.get("servers") || [];
        const selectedServer = servers.find((s) => s._id === serverId);

        if (!selectedServer) {
            return new Error("Server not found");
        }

        showAppView(selectedServer.url);
        return true;
    });

    ipcMain.handle("local-app:addServer", async (event, server: Omit<Server, "_id">) => {
        const servers = settings.get("servers") || [];

        try {
            // TODO: add proper test to see if server url is valid and points to a real WA server
            await fetch(`${server.url}/iframe_api.js`);
        } catch (e) {
            console.error(e);
            return new Error("Invalid server url");
        }

        const newServer = {
            ...server,
            _id: `${servers.length + 1}`,
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

    ipcMain.handle("local-app:saveShortcut", (event, shortcut, key) => saveShortcut(shortcut, key));

    ipcMain.handle("local-app:getShortcuts", (event) => settings.get("shortcuts") || {});
};
