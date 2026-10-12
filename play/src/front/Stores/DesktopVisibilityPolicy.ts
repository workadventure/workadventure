import type { DesktopWindowState } from "../Interfaces/DesktopAppInterfaces";

/**
 * The user left the app when it no longer shows: page hidden (minimized, background tab, or fully covered where the
 * browser engine tracks it: macOS and Windows), window hidden or minimized. Only losing the focus is not leaving:
 * the window keeps showing while the user works on another screen, or drags it.
 */
export function isUserAwayFromApp(documentVisible: boolean, desktopWindowState?: DesktopWindowState): boolean {
    if (!documentVisible) {
        return true;
    }

    if (!desktopWindowState) {
        return false;
    }

    return !desktopWindowState.visible || desktopWindowState.minimized;
}
