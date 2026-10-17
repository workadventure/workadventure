/**
 * Keeps Chrome from freezing this tab while it is in the background.
 *
 * Chrome freezes background tabs (beyond the few most recently used ones, or CPU-hungry ones under Energy Saver),
 * and freezing a page fails every WebSocket it has, as if the page entered the back/forward cache. A frozen tab is
 * woken up 5 seconds every minute: too short to get back into its room, so it loses its connection every minute
 * and stays out of the room for as long as nobody looks at it.
 *
 * Chrome never freezes a page holding a Web Lock. The lock is named after the tab: a tab waiting for a lock held by
 * another tab would not be protected.
 */
export function preventTabFreezing(tabId: string): void {
    // Web Locks only exist in secure contexts (not over plain http from a LAN address).
    if (!("locks" in navigator)) {
        return;
    }
    navigator.locks
        .request(`workadventure-prevent-tab-freezing-${tabId}`, () => new Promise<never>(() => {}))
        .catch((e: unknown) => console.error("Could not hold the Web Lock that keeps the tab from being frozen", e));
}
