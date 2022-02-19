import { BrowserView, BrowserWindow } from "electron";
import windowStateKeeper from "electron-window-state";
import path from "path";

let mainWindow: BrowserWindow | undefined;
let appView: BrowserView | undefined;

const sidebarWidth = 70;

export function getWindow() {
    return mainWindow;
}

export function getAppView() {
    return appView;
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
        webPreferences: {
            preload: path.resolve(__dirname, "..", "build", "preload-local-app", "preload.js"),
        },
    });

    // Let us register listeners on the window, so we can update the state
    // automatically (the listeners will be removed when the window is closed)
    // and restore the maximized or full screen state
    windowState.manage(mainWindow);

    mainWindow.on("closed", () => {
        mainWindow = undefined;
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

    appView = new BrowserView({
        webPreferences: {
            preload: path.resolve(__dirname, "..", "build", "preload-app", "preload.js"),
        },
    });
    appView.setBounds({
        x: sidebarWidth,
        y: 0,
        width: mainWindow.getBounds().width - sidebarWidth,
        height: mainWindow.getBounds().height,
    });
    appView.setAutoResize({
        width: true,
        height: true,
    });

    mainWindow.once("ready-to-show", () => {
        (async () => {
            // appView?.webContents.openDevTools({
            //     mode: "detach",
            // });
            mainWindow?.show();
            mainWindow?.webContents.openDevTools({ mode: "detach" });
        })();
    });

    mainWindow.webContents.on("did-finish-load", () => {
        mainWindow?.setTitle("WorkAdventure Desktop");
    });

    mainWindow.loadFile(path.resolve(__dirname, "..", "local-app", "index.html"));
}

export function showAppView(url?: string) {
    if (!appView) {
        throw new Error("App view not found");
    }

    if (!mainWindow) {
        throw new Error("Main window not found");
    }

    if (mainWindow.getBrowserView()) {
        mainWindow.removeBrowserView(appView);
    }
    mainWindow.addBrowserView(appView);

    if (url) {
        appView.webContents.loadURL(url);
    }
}

export function hideAppView() {
    if (!appView) {
        throw new Error("App view not found");
    }

    if (!mainWindow) {
        throw new Error("Main window not found");
    }

    mainWindow.removeBrowserView(appView);
}
