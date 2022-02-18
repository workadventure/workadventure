import { ipcMain } from "electron";
import { createAndShowNotification } from "./notification";
import settings from "./settings";
import { getAppView, getWindow } from "./window";

export function emitMutedKeyPress() {
  const mainWindow = getWindow();
  if (!mainWindow) {
    throw new Error("Main window not found");
  }

  mainWindow.webContents.send("app:on-muted-key-press");
}

export default () => {
  ipcMain.on("app:notify", (event, txt) => {
    createAndShowNotification({ body: txt });
  });

  ipcMain.handle("sidebar:getServers", () => {
    // TODO: remove
    if (!settings.get("servers")) {
      settings.set("servers", [
        {
          _id: "1",
          name: "WA Demo",
          url: "https://play.staging.workadventu.re/@/tcm/workadventure/wa-village",
        },
        {
          _id: "2",
          name: "My Server",
          url: "http://play.workadventure.localhost/",
        },
      ]);
    }

    return settings.get("servers", []);
  });

  ipcMain.handle("sidebar:selectServer", (event, serverId: string) => {
    const appView = getAppView();
    if (!appView) {
      throw new Error("App view not found");
    }

    const servers = settings.get("servers", []);
    const selectedServer = servers.find((s) => s._id === serverId);

    if (!selectedServer) {
      return new Error("Server not found");
    }

    appView.webContents.loadURL(selectedServer.url);
    return true;
  });

  ipcMain.handle(
    "sidebar:addServer",
    (event, serverName: string, serverUrl: string) => {
      const servers = settings.get("servers", []);
      servers.push({
        _id: `${servers.length + 1}`,
        name: serverName,
        url: serverUrl,
      });
      settings.set("servers", servers);
      return true;
    }
  );
};
