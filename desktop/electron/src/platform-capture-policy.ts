type Env = Record<string, string | undefined>;

/**
 * Under Wayland an app cannot list the screens and windows itself: every request goes through the
 * system share dialog (xdg-desktop-portal), which returns the one source the user picked. Nor can it
 * place a window on a given screen, so "identify screens" cannot work there either. The system
 * dialog is then the picker.
 */
export function usesSystemScreenSharePicker(platform: string, env: Env): boolean {
    return platform === "linux" && env.XDG_SESSION_TYPE === "wayland";
}

/**
 * Whether a window can be kept out of a screen capture (content protection): macOS and Windows only.
 * The meeting bar floats over the shared screen and relies on it, or the viewers would see it.
 */
export function canHideWindowsFromCapture(platform: string): boolean {
    return platform === "darwin" || platform === "win32";
}

/** Under Wayland an app knows neither where its windows are nor where the pointer is. */
export function knowsWindowPositions(platform: string, env: Env): boolean {
    return !usesSystemScreenSharePicker(platform, env);
}
