import type { DesktopWindowState } from "../Interfaces/DesktopAppInterfaces";

export function isUserAwayFromApp(documentVisible: boolean, desktopWindowState?: DesktopWindowState): boolean {
    if (!documentVisible) {
        return true;
    }

    if (!desktopWindowState) {
        return false;
    }

    return !desktopWindowState.focused || !desktopWindowState.visible || desktopWindowState.minimized;
}
