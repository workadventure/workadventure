import { ipcMain } from "electron";
import { createAndShowNotification } from "./notification";
import { getWindow } from "./window";

export function emitMutedKeyPress() {
  const mainWindow = getWindow();
  if (!mainWindow) {
    throw new Error("Main window not found");
  }

  mainWindow.webContents.send("on-muted-key-press");
}

export default () => {
  ipcMain.on("notify", (event, txt) => {
    createAndShowNotification({ body: txt });
  });
};
