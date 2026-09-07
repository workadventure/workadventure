import { BrowserWindow, desktopCapturer, screen } from "electron";
import ElectronLog from "electron-log";
import path from "path";

/**
 * "Identify screens" picker: shows a big number on every physical display and lets the user pick one
 * by clicking it. Returns the matching `screen:` desktopCapturer source (with its display id), which
 * the caller uses to start sharing — and which lets the annotation overlay target the exact display.
 */

export type IdentifiedScreenSource = {
    id: string;
    name: string;
    thumbnailURL: string;
    display_id?: number;
    type: "screen";
};

let windows: BrowserWindow[] = [];
const displayIdByWebContentsId = new Map<number, number>();
let resolvePick: ((source: IdentifiedScreenSource | null) => void) | undefined;
let settled = false;

function closeWindows(): void {
    for (const win of windows) {
        try {
            if (!win.isDestroyed()) {
                win.close();
            }
        } catch {
            /* best-effort */
        }
    }
    windows = [];
    displayIdByWebContentsId.clear();
}

function settle(source: IdentifiedScreenSource | null): void {
    if (settled) {
        return;
    }
    settled = true;
    const done = resolvePick;
    resolvePick = undefined;
    closeWindows();
    done?.(source);
}

async function resolveSourceForDisplay(displayId: number): Promise<IdentifiedScreenSource | null> {
    try {
        const sources = await desktopCapturer.getSources({ types: ["screen"] });
        const match =
            sources.find((source) => source.display_id && Number(source.display_id) === displayId) ??
            sources.find((source) => new RegExp(`^screen:${displayId}:`).test(source.id));
        if (match) {
            return { id: match.id, name: match.name, thumbnailURL: "", display_id: displayId, type: "screen" };
        }
    } catch (error) {
        ElectronLog.warn("screen-identify: getSources failed", error);
    }
    return null;
}

export function handleScreenIdentifyPick(webContentsId: number): void {
    const displayId = displayIdByWebContentsId.get(webContentsId);
    if (settled || resolvePick === undefined) {
        return;
    }
    if (displayId === undefined) {
        settle(null);
        return;
    }
    resolveSourceForDisplay(displayId)
        .then((source) => settle(source))
        .catch(() => settle(null));
}

export function handleScreenIdentifyCancel(): void {
    settle(null);
}

export function closeScreenIdentify(): void {
    settle(null);
}

export function identifyScreens(): Promise<IdentifiedScreenSource | null> {
    closeWindows();
    settled = false;
    const displays = screen.getAllDisplays();
    return new Promise((resolve) => {
        resolvePick = resolve;
        if (displays.length === 0) {
            settle(null);
            return;
        }
        displays.forEach((display, index) => {
            const number = String(index + 1);
            const win = new BrowserWindow({
                x: display.bounds.x,
                y: display.bounds.y,
                width: display.bounds.width,
                height: display.bounds.height,
                transparent: true,
                frame: false,
                resizable: false,
                movable: false,
                minimizable: false,
                maximizable: false,
                fullscreenable: false,
                skipTaskbar: true,
                alwaysOnTop: true,
                hasShadow: false,
                backgroundColor: "#00000000",
                show: false,
                webPreferences: {
                    preload: path.resolve(__dirname, "preload-screen-identify", "preload.js"),
                    nodeIntegration: false,
                    contextIsolation: true,
                    sandbox: true,
                    webSecurity: true,
                },
            });
            win.setMenu(null);
            try {
                win.setAlwaysOnTop(true, "screen-saver");
            } catch (error) {
                ElectronLog.debug("screen-identify setAlwaysOnTop failed", error);
            }
            try {
                win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
            } catch (error) {
                ElectronLog.debug("screen-identify setVisibleOnAllWorkspaces failed", error);
            }
            displayIdByWebContentsId.set(win.webContents.id, display.id);

            const label = `${display.bounds.width}×${display.bounds.height}`;
            const html =
                '<!doctype html><html><head><meta charset="utf-8">' +
                "<meta http-equiv=\"Content-Security-Policy\" content=\"default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline';\">" +
                "<style>html,body{margin:0;height:100vh;width:100vw;overflow:hidden;" +
                'font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}' +
                "#r{height:100vh;display:flex;align-items:center;justify-content:center;" +
                "background:rgba(10,15,25,0.5);color:#fff;cursor:pointer;-webkit-user-select:none;user-select:none}" +
                "#r:hover{background:rgba(65,86,246,0.38)}" +
                "#n{font-size:24vh;font-weight:800;line-height:1;text-shadow:0 4px 28px rgba(0,0,0,0.6)}" +
                "#h{font-size:3.2vh;opacity:0.85;margin-top:2vh}</style></head>" +
                '<body><div id="r"><div style="text-align:center">' +
                '<div id="n">' +
                number +
                '</div><div id="h">Click to share this screen · ' +
                label +
                "</div></div></div>" +
                '<script>document.getElementById("r").addEventListener("click",function(){' +
                "window.WAScreenPick&&window.WAScreenPick.pick()});" +
                'document.addEventListener("keydown",function(e){if(e.key==="Escape")' +
                "window.WAScreenPick&&window.WAScreenPick.cancel()});</script></body></html>";
            win.loadURL("data:text/html;charset=utf-8," + encodeURIComponent(html)).catch((error) =>
                ElectronLog.error("screen-identify: failed to load", error)
            );
            win.once("ready-to-show", () => {
                if (!win.isDestroyed()) {
                    win.show();
                }
            });
            windows.push(win);
        });
    });
}
