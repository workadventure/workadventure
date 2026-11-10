import path from "path";
import { pathToFileURL } from "url";
import { app } from "electron";

// While developing, electron-vite serves the Landing from its dev server, for hot reload. Only an
// unpackaged run takes that address: a packaged app trusts nothing but the file it ships.
const devServerUrl = app.isPackaged ? undefined : process.env.ELECTRON_RENDERER_URL;
const landingUrl = devServerUrl
    ? new URL("/", devServerUrl)
    : pathToFileURL(path.resolve(__dirname, "landing", "index.html"));

/** Where the Landing loads from, with the `?error=` or `?trust=` it has to show. */
export function landingPageUrl(query?: Record<string, string>): string {
    const url = new URL(landingUrl);
    url.search = new URLSearchParams(query).toString();
    return url.href;
}

/** Whether a frame shows the Landing, whatever its query: the only page given the Landing's IPC. */
export function isLandingPageUrl(frameUrl: string): boolean {
    try {
        const url = new URL(frameUrl);
        return (
            url.protocol === landingUrl.protocol && url.host === landingUrl.host && url.pathname === landingUrl.pathname
        );
    } catch {
        return false;
    }
}
