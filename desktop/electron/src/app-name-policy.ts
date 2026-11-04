export const DESKTOP_APP_NAME = "WorkAdventure";

// The map name comes first: a taskbar or window switcher cuts long titles at the end.
export function createDesktopWindowTitle(mapName?: string): string {
    const name = mapName?.trim();
    return name ? `${name} - ${DESKTOP_APP_NAME}` : DESKTOP_APP_NAME;
}
