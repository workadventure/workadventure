import { BrowserWindow, WebContentsView } from "electron";
import ElectronLog from "electron-log";
import path from "path";
import { formatWorldHistoryLabel } from "./desktop-url-policy";

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
    /** The WorkAdventure world name (admin-configured), pushed by the renderer. Highest priority. */
    appTitle?: string;
    /** URL-derived fallback label (e.g. "team / world / room"), used until the app pushes a name. */
    urlLabel: string;
    url: string;
};

function tabTitle(tab: WorldTab): string {
    return tab.appTitle || tab.urlLabel || "New world";
}

/** Lightweight tab descriptor for the tab-strip renderer. */
export type TabInfo = {
    id: string;
    title: string;
    active: boolean;
};

let shell: BrowserWindow | undefined;
const tabs: WorldTab[] = [];
let activeTabId: string | undefined;
let tabIdCounter = 0;

// Height reserved at the top of the shell for the tab strip. 0 until the strip lands (commit 2).
let tabStripHeight = 0;

const listeners = new Set<() => void>();
const activeChangeListeners = new Set<() => void>();

function emitChange(): void {
    for (const listener of listeners) {
        try {
            listener();
        } catch {
            /* a broken listener must not stop the others */
        }
    }
}

function emitActiveChange(): void {
    for (const listener of activeChangeListeners) {
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

/**
 * Subscribe to ACTIVE-tab changes only (not title/list churn). window.ts uses this to tear down
 * the PiP / overlay / HUD windows that belonged to the previously-active world when the user
 * switches tabs — otherwise their relays would misroute to the new tab's renderer.
 */
export function onActiveTabChange(listener: () => void): () => void {
    activeChangeListeners.add(listener);
    return () => activeChangeListeners.delete(listener);
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
    const tab: WorldTab = { id, view, urlLabel: "New world", url: "" };
    tabs.push(tab);
    shell.contentView.addChildView(view);

    // Tab label priority: the WA world name (setActiveTabTitle, admin-configured) over a
    // URL-derived label. A full navigation loads a new document → a new world → clear the app
    // title and wait for the renderer to push the new world's name. An in-page (SPA) navigation
    // just refreshes the URL fallback and keeps the app-pushed name.
    view.webContents.on("did-navigate", (_event, url) => {
        tab.url = url;
        tab.appTitle = undefined;
        const label = formatWorldHistoryLabel(url);
        if (label && label !== "Unknown world") {
            tab.urlLabel = label;
        }
        emitChange();
    });
    view.webContents.on("did-navigate-in-page", (_event, url, isMainFrame) => {
        if (!isMainFrame) {
            return;
        }
        tab.url = url;
        const label = formatWorldHistoryLabel(url);
        if (label && label !== "Unknown world") {
            tab.urlLabel = label;
            emitChange();
        }
    });

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
    emitActiveChange();
    emitChange();
}

export function closeTab(id: string): void {
    // Never close the last tab — that would leave an empty shell with no world view (and every
    // subsequent navigation would throw "No active world view"). The strip hides its close button
    // for a lone tab, but the Cmd+W menu path can still reach here.
    if (tabs.length <= 1) {
        return;
    }
    const index = tabs.findIndex((tab) => tab.id === id);
    if (index === -1) {
        return;
    }
    const wasActive = activeTabId === id;
    const [tab] = tabs.splice(index, 1);
    if (wasActive) {
        // Activate the neighbour (prefer the one to the left, like browsers).
        const next = tabs[index - 1] ?? tabs[index];
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
    if (wasActive) {
        emitActiveChange();
    }
    emitChange();
}

export function getTabs(): WorldTab[] {
    return tabs;
}

export function getTabsInfo(): TabInfo[] {
    return tabs.map((tab) => ({ id: tab.id, title: tabTitle(tab), active: tab.id === activeTabId }));
}

/** Set the WorkAdventure world name for the ACTIVE tab (pushed by the renderer on scene load). */
export function setActiveWorldTitle(title: string): void {
    const tab = tabs.find((entry) => entry.id === activeTabId);
    if (!tab) {
        return;
    }
    const next = title.trim() || undefined;
    if (tab.appTitle === next) {
        return;
    }
    tab.appTitle = next;
    emitChange();
}

/** Activate the tab at a given index (0-based), for Cmd+1..9 style switching. */
export function activateTabByIndex(index: number): void {
    const tab = tabs[index];
    if (tab) {
        activateTab(tab.id);
    }
}

/** Activate the next/previous tab, wrapping around. */
export function cycleTab(direction: 1 | -1): void {
    if (tabs.length < 2) {
        return;
    }
    const currentIndex = tabs.findIndex((tab) => tab.id === activeTabId);
    const nextIndex = (currentIndex + direction + tabs.length) % tabs.length;
    activateTab(tabs[nextIndex].id);
}

export function closeActiveTab(): void {
    if (activeTabId) {
        closeTab(activeTabId);
    }
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
    // Drop the destroyed shell reference (its listeners die with the window); the next
    // createWindow → setShell installs a fresh one. Mirrors resetTabStrip's own cleanup.
    shell = undefined;
    tabStripHeight = 0;
}
