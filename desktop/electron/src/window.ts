import { BrowserView, BrowserWindow, app } from "electron";
import electronIsDev from "electron-is-dev";
import windowStateKeeper from "electron-window-state";
import path from "path";
import { loadCustomScheme } from "./serve";

let mainWindow: BrowserWindow | undefined;
let appView: BrowserView | undefined;
let appViewUrl = "";

const sidebarWidth = 80;

export function getWindow() {
    return mainWindow;
}

export function getAppView() {
    return appView;
}

function resizeAppView() {
    // TODO: workaround: set timeout is needed as mainWindow.getBounds() needs some time to update
    setTimeout(() => {
        if (!mainWindow || !appView) {
            return;
        }

        const { width, height } = mainWindow.getBounds();

        appView.setBounds({
            x: sidebarWidth,
            y: 0,
            width: width - sidebarWidth,
            height: height,
        });
    });
}

export async function createWindow() {
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
            preload: path.resolve(__dirname, "..", "dist", "preload-local-app", "preload.js"),
        },
    });
    mainWindow.setMenu(null);

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
            preload: path.resolve(__dirname, "..", "dist", "preload-app", "preload.js"),
        },
    });
    resizeAppView();
    appView.setAutoResize({ width: true, height: true });
    mainWindow.on("resize", resizeAppView);

    mainWindow.once("ready-to-show", () => {
        mainWindow?.show();
    });

    mainWindow.webContents.on("did-finish-load", () => {
        mainWindow?.setTitle("WorkAdventure Desktop (alpha release)");
    });

    if (electronIsDev && process.env.LOCAL_APP_URL) {
        await mainWindow.loadURL(process.env.LOCAL_APP_URL);
    } else {
        // load custom url scheme app://
        await loadCustomScheme(mainWindow);
        await mainWindow.loadURL("app://-");
    }
}

export async function showAppView(url?: string) {
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

    if (url && url !== appViewUrl) {
        await appView.webContents.loadURL(url);
        appViewUrl = url;
    }

    appView.webContents.focus();
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
