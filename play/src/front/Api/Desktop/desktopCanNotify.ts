/**
 * True when the page runs in the desktop app and the app can show a system notification
 * (`notifyMessage` since contract 2, `notify` before). This is the one "in the desktop app" test
 * for notifications: an app that exposes `WAD.desktop` without a way to notify gets the web
 * behaviour.
 */
export function desktopCanNotify(): boolean {
    const wad = window.WAD;
    return typeof wad?.notifyMessage === "function" || typeof wad?.notify === "function";
}
