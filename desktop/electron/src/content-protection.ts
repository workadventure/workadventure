import electronIsDev from "electron-is-dev";

/**
 * Whether the frameless presenter surface — the meeting bar — should be hidden from screen capture
 * via `setContentProtection(true)`
 * (NSWindowSharingNone on macOS, SetWindowDisplayAffinity/WDA_MONITOR on Windows).
 *
 * In production this exclusion is a real feature: viewers of a shared screen must not see the
 * presenter's own control chrome.
 *
 * The catch is that content protection blanks these windows in EVERY capture, including the
 * developer's own screenshots and screen recordings — which makes the components impossible to
 * document. So we turn it off while developing (`electron-is-dev`, i.e. an unpackaged run such as
 * `yarn dev`) and whenever `WA_ALLOW_WINDOW_CAPTURE=1` is set (to grab documentation/marketing shots
 * from a packaged build). Normal production runs keep the protection on.
 *
 * The companion panel is an ordinary utility window: it is only protected while the user shares
 * their screen (see companion-controller), still subject to this helper.
 */
export function shouldProtectWindowFromCapture(): boolean {
    if (process.env.WA_ALLOW_WINDOW_CAPTURE === "1") {
        return false;
    }
    return !electronIsDev;
}
