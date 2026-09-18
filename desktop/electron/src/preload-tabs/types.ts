// Protocol between the main process and the tab-strip renderer. Dependency-free so the sandboxed
// strip stays isolated.

export type TabInfo = {
    id: string;
    title: string;
    active: boolean;
};

export type WorkAdventureTabsApi = {
    /** Receive the current tab list on every change. Returns an unsubscriber. */
    onTabs: (callback: (tabs: TabInfo[]) => void) => () => void;
    /** Open a new tab (starts on the Landing page). */
    newTab: () => void;
    /** Make a tab active (bring its world to the front). */
    activate: (id: string) => void;
    /** Close a tab. */
    close: (id: string) => void;
    /** Signal the strip is ready; the main process replies with the current tab list. */
    ready: () => void;
};

declare global {
    interface Window {
        WATabs?: WorkAdventureTabsApi;
    }
}

export {};
