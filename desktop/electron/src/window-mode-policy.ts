import type { DesktopWindowMode, DesktopWindowModeState } from "@workadventure/desktop-api";

/**
 * Linux under Wayland: the app runs through XWayland ("x11", the default) or natively ("wayland"), see
 * DesktopWindowMode. Chromium picks its platform when it starts, from the command line only (switching
 * it from code leaves a Wayland window and a crashing GPU process), so the app restarts itself with
 * --ozone-platform=x11.
 */

const X11_ARG = "--ozone-platform=x11";
/** Marks the X11 restart, to tell it from an --ozone-platform the user passed. */
export const X11_RESTART_ARG = "--wa-x11-restart";

type Env = Record<string, string | undefined>;

export function windowModeApplies(platform: string, env: Env): boolean {
    return platform === "linux" && env.XDG_SESSION_TYPE === "wayland";
}

function hasOzoneArg(argv: string[]): boolean {
    return argv.some((arg) => arg.startsWith("--ozone-platform"));
}

export function windowModeState(s: {
    saved: DesktopWindowMode;
    argv: string[];
    env: Env;
    packaged: boolean;
}): DesktopWindowModeState {
    const setByCommandLine = hasOzoneArg(s.argv) && !s.argv.includes(X11_RESTART_ARG);
    const x11Unavailable = !s.env.DISPLAY;
    const running: DesktopWindowMode = s.argv.includes(X11_ARG) ? "x11" : "wayland";
    const next: DesktopWindowMode = s.saved === "x11" && x11Unavailable ? "wayland" : s.saved;
    return {
        saved: s.saved,
        setByCommandLine,
        x11Unavailable,
        // Unpackaged (npm run dev), the app never restarts itself: electron-vite would stop with it.
        restartNeeded: s.packaged && !setByCommandLine && next !== running,
    };
}

/**
 * At startup, once the settings are loaded: restart in X11 mode, or report that the last X11 start
 * never got going (its pending flag is still set), in which case the app stays in Wayland mode.
 */
export function startupWindowModeAction(s: {
    applies: boolean;
    state: DesktopWindowModeState;
    argv: string[];
    x11StartPending: boolean;
}): "none" | "restart-in-x11" | "x11-failed" {
    if (!s.applies || hasOzoneArg(s.argv) || !s.state.restartNeeded) {
        return "none";
    }
    return s.x11StartPending ? "x11-failed" : "restart-in-x11";
}

/** The arguments to restart with: the original ones, without the X11 restart's, plus those if asked. */
export function restartArgs(argv: string[], inX11: boolean): string[] {
    const args = argv.slice(1).filter((arg) => arg !== X11_ARG && arg !== X11_RESTART_ARG);
    return inX11 ? [...args, X11_ARG, X11_RESTART_ARG] : args;
}
