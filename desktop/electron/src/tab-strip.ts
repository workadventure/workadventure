import { BrowserWindow, WebContentsView } from "electron";
import ElectronLog from "electron-log";
import path from "path";
import { getTabs, getTabsInfo, onTabsChange, setTabStripHeight } from "./tab-manager";
import settings from "./settings";

/**
 * The tab strip: a thin WebContentsView pinned to the top of the shell, above the world views. It
 * renders the open tabs + a "new tab" button and drives tab operations over IPC. It only shows while
 * several tabs are open, and never when the user turned it off with the "Show tab bar" menu item
 * (persisted in settings). Hidden, it collapses to zero height and the active world view reclaims
 * the whole shell.
 */

export const TAB_STRIP_HEIGHT = 40;

let shell: BrowserWindow | undefined;
let stripView: WebContentsView | undefined;
let stripReady = false;
let unsubscribeTabs: (() => void) | undefined;
let tabBarEnabled = true;
let tabBarVisible = false;

function layoutStrip(): void {
    if (!shell || shell.isDestroyed() || !stripView) {
        return;
    }
    const [width] = shell.getContentSize();
    stripView.setBounds({ x: 0, y: 0, width, height: tabBarVisible ? TAB_STRIP_HEIGHT : 0 });
}

function shouldShowStrip(): boolean {
    return tabBarEnabled && getTabs().length > 1;
}

/**
 * Show or hide the strip view and collapse the reserved top offset, so the active world view grows
 * to fill the freed space.
 */
function applyVisibility(): void {
    tabBarVisible = shouldShowStrip();
    if (stripView && !stripView.webContents.isDestroyed()) {
        stripView.setVisible(tabBarVisible);
    }
    layoutStrip();
    setTabStripHeight(tabBarVisible ? TAB_STRIP_HEIGHT : 0);
}

/** The "Show tab bar" toggle: when enabled, the strip still waits for a second tab to show. */
export function setTabStripVisible(enabled: boolean): void {
    tabBarEnabled = enabled;
    applyVisibility();
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
    tabBarEnabled = settings.get("tab_bar_enabled") !== false;
    applyVisibility();

    shell.on("resize", layoutStrip);
    shell.on("enter-full-screen", layoutStrip);
    shell.on("leave-full-screen", layoutStrip);

    unsubscribeTabs = onTabsChange(() => {
        // Push the list first, so a strip that appears for a second tab never shows the old one.
        pushTabs();
        if (shouldShowStrip() !== tabBarVisible) {
            applyVisibility();
        }
    });

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
    // The page of a WebContentsView outlives its window unless closed: left open, it could keep the
    // app from quitting (seen with two worlds open).
    if (stripView && !stripView.webContents.isDestroyed()) {
        stripView.webContents.close();
    }
    stripView = undefined;
    shell = undefined;
}
