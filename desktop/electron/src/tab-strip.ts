import { BrowserWindow, WebContentsView } from "electron";
import ElectronLog from "electron-log";
import path from "path";
import { getTabsInfo, onTabsChange, setTabStripHeight } from "./tab-manager";

/**
 * The tab strip: a thin always-visible WebContentsView pinned to the top of the shell, above the
 * world views. It renders the open tabs + a "new tab" button and drives tab operations over IPC.
 */

export const TAB_STRIP_HEIGHT = 40;

let shell: BrowserWindow | undefined;
let stripView: WebContentsView | undefined;
let stripReady = false;
let unsubscribeTabs: (() => void) | undefined;

function layoutStrip(): void {
    if (!shell || shell.isDestroyed() || !stripView) {
        return;
    }
    const [width] = shell.getContentSize();
    stripView.setBounds({ x: 0, y: 0, width, height: TAB_STRIP_HEIGHT });
}

export function pushTabs(): void {
    if (stripView && stripReady && !stripView.webContents.isDestroyed()) {
        stripView.webContents.send("app:tabs:list", getTabsInfo());
    }
}

export function createTabStrip(shellWindow: BrowserWindow): void {
    shell = shellWindow;
    stripView = new WebContentsView({
        webPreferences: {
            preload: path.resolve(__dirname, "..", "dist", "preload-tabs", "preload.js"),
            nodeIntegration: false,
            contextIsolation: true,
            sandbox: true,
            webSecurity: true,
        },
    });
    shell.contentView.addChildView(stripView);
    layoutStrip();
    setTabStripHeight(TAB_STRIP_HEIGHT);

    shell.on("resize", layoutStrip);
    shell.on("enter-full-screen", layoutStrip);
    shell.on("leave-full-screen", layoutStrip);

    unsubscribeTabs = onTabsChange(pushTabs);

    const indexPath = path.resolve(__dirname, "..", "assets", "tabs", "index.html");
    stripView.webContents.loadFile(indexPath).catch((error) => {
        ElectronLog.error(`Failed to load tab strip at ${indexPath}`, error);
    });
}

export function markTabStripReady(sender: Electron.WebContents): void {
    if (stripView && !stripView.webContents.isDestroyed() && stripView.webContents === sender) {
        stripReady = true;
        pushTabs();
    }
}

export function isTabStripSender(sender: Electron.WebContents): boolean {
    return Boolean(stripView && !stripView.webContents.isDestroyed() && stripView.webContents === sender);
}

export function resetTabStrip(): void {
    unsubscribeTabs?.();
    unsubscribeTabs = undefined;
    stripReady = false;
    stripView = undefined;
    shell = undefined;
}
