import electronIsDev from "electron-is-dev";

/**
 * Whether the frameless presenter surfaces — the meeting bar, the annotation bar and the transparent
 * screen-share overlay — should be hidden from screen capture via `setContentProtection(true)`
 * (NSWindowSharingNone on macOS, SetWindowDisplayAffinity/WDA_MONITOR on Windows).
 *
 * In production this exclusion is a real feature: viewers of a shared screen must not see the
 * presenter's own control chrome, and the local annotation overlay is kept out of the captured pixels
 * so strokes aren't drawn twice (once baked into the video, once via the network overlay).
 *
 * The catch is that content protection blanks these windows in EVERY capture, including the
 * developer's own screenshots and screen recordings — which makes the components impossible to
 * document. So we turn it off while developing (`electron-is-dev`, i.e. an unpackaged run such as
 * `yarn dev`) and whenever `WA_ALLOW_WINDOW_CAPTURE=1` is set (to grab documentation/marketing shots
 * from a packaged build). Normal production runs keep the protection on.
 *
 * The companion panel is intentionally NOT routed through this helper: it is an ordinary utility
 * window with no reason to be excluded from capture, so it is never protected.
 */
export function shouldProtectWindowFromCapture(): boolean {
    if (process.env.WA_ALLOW_WINDOW_CAPTURE === "1") {
        return false;
    }
    return !electronIsDev;
}
