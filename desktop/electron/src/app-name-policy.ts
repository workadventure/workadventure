export const DESKTOP_APP_NAME = "WorkAdventure";

// The map name comes first: a taskbar or window switcher cuts long titles at the end. A beta version
// (2.0.0-beta.1) says so; the suffix goes away by itself with the first stable version.
export function createDesktopWindowTitle(mapName?: string, version = ""): string {
    const appName = version.includes("-beta") ? `${DESKTOP_APP_NAME} (beta)` : DESKTOP_APP_NAME;
    const name = mapName?.trim();
    return name ? `${name} - ${appName}` : appName;
}
