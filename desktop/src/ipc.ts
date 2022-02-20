import { ipcMain } from "electron";
import electronIsDev from "electron-is-dev";
import { createAndShowNotification } from "./notification";
import { Server } from "./preload-local-app/types";
import settings from "./settings";
import { getWindow, hideAppView, showAppView } from "./window";

export function emitMutedKeyPress() {
    const mainWindow = getWindow();
    if (!mainWindow) {
        throw new Error("Main window not found");
    }

    mainWindow.webContents.send("app:on-muted-key-press");
}

export default () => {
    ipcMain.handle("is-development", () => electronIsDev);

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

    ipcMain.handle("local-app:addServer", (event, server: Omit<Server, "_id">) => {
        const servers = settings.get("servers") || [];
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
};
