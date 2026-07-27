import { BrowserWindow, WebContentsView } from "electron";
import ElectronLog from "electron-log";
import path from "path";
import { getTabsInfo, onTabsChange, setTabStripHeight } from "./tab-manager";
import settings from "./settings";

/**
 * The tab strip: a thin WebContentsView pinned to the top of the shell, above the world views. It
 * renders the open tabs + a "new tab" button and drives tab operations over IPC. Most users run
 * single-tab, so it can be hidden via the "Show tab bar" menu item (persisted in settings); when
 * hidden it collapses to zero height and the active world view reclaims the whole shell.
 */

export const TAB_STRIP_HEIGHT = 40;

let shell: BrowserWindow | undefined;
let stripView: WebContentsView | undefined;
let stripReady = false;
let unsubscribeTabs: (() => void) | undefined;
let tabBarVisible = true;

function layoutStrip(): void {
    if (!shell || shell.isDestroyed() || !stripView) {
        return;
    }
    const [width] = shell.getContentSize();
    stripView.setBounds({ x: 0, y: 0, width, height: tabBarVisible ? TAB_STRIP_HEIGHT : 0 });
}

/**
 * Show/hide the tab strip at runtime (the "Show tab bar" menu toggle). Collapses the reserved top
 * offset so the active world view grows to fill the freed space, and hides the strip view itself.
 */
export function setTabStripVisible(visible: boolean): void {
    tabBarVisible = visible;
    if (stripView && !stripView.webContents.isDestroyed()) {
        stripView.setVisible(visible);
    }
    layoutStrip();
    setTabStripHeight(visible ? TAB_STRIP_HEIGHT : 0);
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
    // Respect the persisted preference: start hidden (zero height) when the user turned the bar off.
    tabBarVisible = settings.get("tab_bar_enabled") !== false;
    stripView.setVisible(tabBarVisible);
    layoutStrip();
    setTabStripHeight(tabBarVisible ? TAB_STRIP_HEIGHT : 0);

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
