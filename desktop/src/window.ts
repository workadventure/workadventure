import { BrowserWindow } from "electron";
import electronIsDev from "electron-is-dev";
import windowStateKeeper from "electron-window-state";
import path from "path";

let mainWindow: BrowserWindow | undefined;

const url = process.env.PLAY_URL;
// "https://play.staging.workadventu.re/@/tcm/workadventure/wa-village"; // TODO

export function getWindow() {
  return mainWindow;
}

export function createWindow() {
  // do not re-create window if still existing
  if (mainWindow) {
    return;
  }

  // Load the previous state with fallback to defaults
  const windowState = windowStateKeeper({
    defaultWidth: 1000,
    defaultHeight: 800,
    maximize: true,
  });

  mainWindow = new BrowserWindow({
    x: windowState.x,
    y: windowState.y,
    width: windowState.width,
    height: windowState.height,
    autoHideMenuBar: true,
    show: false,
    title: "WorkAdventure",
    webPreferences: {
      preload: path.join(__dirname, "../dist/preload/index.js"),
      // allowRunningInsecureContent: false,
      // contextIsolation: true, // TODO: remove in electron 12
      // nodeIntegration: false,
      // sandbox: true,
    },
  });

  // Let us register listeners on the window, so we can update the state
  // automatically (the listeners will be removed when the window is closed)
  // and restore the maximized or full screen state
  windowState.manage(mainWindow);

  mainWindow.on("show", () => {
    // TODO
  });

  mainWindow.on("closed", () => {
    mainWindow = undefined;
  });

  mainWindow.once("ready-to-show", () => {
    mainWindow?.show();
  });

  // mainWindow.on('close', async (event) => {
  //   if (!app.confirmedExitPrompt) {
  //     event.preventDefault(); // Prevents the window from closing
  //     const choice = await dialog.showMessageBox(getMainWindow(), {
  //       type: 'question',
  //       buttons: ['Yes', 'Abort'],
  //       title: 'Confirm',
  //       message: 'Are you sure you want to quit?',
  //     });
  //     if (choice.response === 0) {
  //       app.confirmedExitPrompt = true;
  //       mainWindow.close();
  //     }
  //   } else {
  //     app.confirmedExitPrompt = false;
  //   }
  // });

  if (!url || electronIsDev) {
    // TODO
    mainWindow.loadFile("../test-app/index.html");
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadURL(url); // TODO: load app on demand
  }
}
