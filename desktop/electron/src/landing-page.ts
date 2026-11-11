import path from "path";
import { pathToFileURL } from "url";
import { app } from "electron";

// While developing, electron-vite serves the native pages from its dev server, for hot reload. Only an
// unpackaged run takes that address: a packaged app trusts nothing but the files it ships.
const devServerUrl = app.isPackaged ? undefined : process.env.ELECTRON_RENDERER_URL;

function nativePageUrl(page: "landing" | "settings"): URL {
    return devServerUrl
        ? new URL(`/${page}/index.html`, devServerUrl)
        : pathToFileURL(path.resolve(__dirname, page, "index.html"));
}

const landingUrl = nativePageUrl("landing");
export const settingsPageUrl = nativePageUrl("settings");

function isPageUrl(page: URL, frameUrl: string): boolean {
    try {
        const url = new URL(frameUrl);
        return url.protocol === page.protocol && url.host === page.host && url.pathname === page.pathname;
    } catch {
        return false;
    }
}

/** Where the Landing loads from, with the `?error=` or `?trust=` it has to show. */
export function landingPageUrl(query?: Record<string, string>): string {
    const url = new URL(landingUrl);
    url.search = new URLSearchParams(query).toString();
    return url.href;
}

/** Whether a frame shows the Landing, whatever its query: the only page given the Landing's IPC. */
export function isLandingPageUrl(frameUrl: string): boolean {
    return isPageUrl(landingUrl, frameUrl);
}

/** Whether a frame shows the settings page: the only page given the settings window's IPC. */
export function isSettingsPageUrl(frameUrl: string): boolean {
    return isPageUrl(settingsPageUrl, frameUrl);
}
