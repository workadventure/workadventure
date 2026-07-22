import { BrowserWindow, WebContentsView } from "electron";
import ElectronLog from "electron-log";
import path from "path";

/**
 * Owns the world tabs. Each open world is a WebContentsView (Electron 42 — BrowserView is
 * deprecated) hosted inside the shell BrowserWindow; only the active tab's view is visible, so all
 * tabs keep running (WebSocket/WebRTC stay alive) while just one is on screen. window.ts wires the
 * navigation security + load logic onto each view's webContents; this module only manages the
 * view lifecycle, activation and layout.
 *
 * "Only the active tab captures media" falls out for free: a backgrounded view is hidden, so its
 * renderer's document loses focus and the existing PrivacyShutdown/focus logic stops its camera.
 */

export type WorldTab = {
    id: string;
    view: WebContentsView;
};

let shell: BrowserWindow | undefined;
const tabs: WorldTab[] = [];
let activeTabId: string | undefined;
let tabIdCounter = 0;

// Height reserved at the top of the shell for the tab strip. 0 until the strip lands (commit 2).
let tabStripHeight = 0;

const listeners = new Set<() => void>();

function emitChange(): void {
    for (const listener of listeners) {
        try {
            listener();
        } catch {
            /* a broken listener must not stop the others */
        }
    }
}

/** Subscribe to tab set/active changes (used by the tab strip). Returns an unsubscriber. */
export function onTabsChange(listener: () => void): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
}

export function setShell(window: BrowserWindow): void {
    shell = window;
    shell.on("resize", layoutActiveView);
    shell.on("enter-full-screen", layoutActiveView);
    shell.on("leave-full-screen", layoutActiveView);
}

export function setTabStripHeight(height: number): void {
    tabStripHeight = Math.max(0, Math.floor(height));
    layoutActiveView();
}

/** Position the active world view to fill the shell below the tab strip; hide the rest. */
export function layoutActiveView(): void {
    if (!shell || shell.isDestroyed()) {
        return;
    }
    const [width, height] = shell.getContentSize();
    for (const tab of tabs) {
        const isActive = tab.id === activeTabId;
        tab.view.setVisible(isActive);
        if (isActive) {
            tab.view.setBounds({
                x: 0,
                y: tabStripHeight,
                width,
                height: Math.max(0, height - tabStripHeight),
            });
        }
    }
}

/**
 * Create a new world view and add it to the shell. `configure` is called with the fresh
 * webContents so window.ts can attach navigation-security handlers before anything loads. The new
 * tab does NOT auto-activate unless it's the first one — callers decide via activateTab.
 */
export function createWorldView(configure: (view: WebContentsView) => void): WorldTab {
    if (!shell) {
        throw new Error("Tab manager shell not set");
    }
    const view = new WebContentsView({
        webPreferences: {
            preload: path.resolve(__dirname, "..", "dist", "preload-app", "preload.js"),
            nodeIntegration: false,
            contextIsolation: true,
            sandbox: true,
            webSecurity: true,
        },
    });
    const id = `tab-${++tabIdCounter}`;
    const tab: WorldTab = { id, view };
    tabs.push(tab);
    shell.contentView.addChildView(view);

    configure(view);

    if (!activeTabId) {
        activeTabId = id;
    }
    layoutActiveView();
    emitChange();
    return tab;
}

export function activateTab(id: string): void {
    if (!tabs.some((tab) => tab.id === id) || activeTabId === id) {
        return;
    }
    activeTabId = id;
    layoutActiveView();
    const view = getActiveWorldView();
    if (view && !view.webContents.isDestroyed()) {
        view.webContents.focus();
    }
    emitChange();
}

export function closeTab(id: string): void {
    const index = tabs.findIndex((tab) => tab.id === id);
    if (index === -1) {
        return;
    }
    const [tab] = tabs.splice(index, 1);
    if (activeTabId === id) {
        // Activate the neighbour (prefer the one to the left, like browsers).
        const next = tabs[index - 1] ?? tabs[index] ?? undefined;
        activeTabId = next?.id;
    }
    try {
        if (shell && !shell.isDestroyed()) {
            shell.contentView.removeChildView(tab.view);
        }
        if (!tab.view.webContents.isDestroyed()) {
            tab.view.webContents.close();
        }
    } catch (error) {
        ElectronLog.debug("closeTab teardown failed", error);
    }
    layoutActiveView();
    emitChange();
}

export function getTabs(): WorldTab[] {
    return tabs;
}

export function getTabCount(): number {
    return tabs.length;
}

export function getActiveTabId(): string | undefined {
    return activeTabId;
}

export function getActiveWorldView(): WebContentsView | undefined {
    return tabs.find((tab) => tab.id === activeTabId)?.view;
}

export function getActiveWorldContents(): Electron.WebContents | undefined {
    const view = getActiveWorldView();
    return view && !view.webContents.isDestroyed() ? view.webContents : undefined;
}

/** True if the webContents belongs to any of our world views (active or background). */
export function isWorldContents(contents: Electron.WebContents): boolean {
    return tabs.some((tab) => !tab.view.webContents.isDestroyed() && tab.view.webContents === contents);
}

/** True if the webContents is the ACTIVE world view (used to gate media/PiP/presence IPC). */
export function isActiveWorldContents(contents: Electron.WebContents): boolean {
    return getActiveWorldContents() === contents;
}

export function resetTabs(): void {
    for (const tab of [...tabs]) {
        try {
            if (!tab.view.webContents.isDestroyed()) {
                tab.view.webContents.close();
            }
        } catch {
            /* best-effort */
        }
    }
    tabs.length = 0;
    activeTabId = undefined;
}
