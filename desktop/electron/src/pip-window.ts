import { getHudWindow, isHudWindowOpen } from "./hud-windows";

/**
 * The meeting video (formerly a standalone always-on-top PiP window, then a child WebContentsView of
 * the companion) is now hosted directly by the companion window's own renderer: the tiles render as
 * HTML <video> elements, WebRTC-mirrored from the WorkAdventure renderer through the WAHud bridge.
 *
 * There is no separate PiP webContents any more — this module only relays the app:pip:* signaling to
 * the companion window and reports whether it is open. The public names (`isPipWindowOpen`,
 * `getPipWebContents`, `sendToPip`) are kept so the app:pip:* relay in ipc.ts and the front's WAD.pip
 * client stay untouched: to the WorkAdventure renderer, "the PiP" is now just the companion.
 */

/** True when the companion window (which hosts the meeting video) is open. */
export function isPipWindowOpen(): boolean {
    return isHudWindowOpen("companion");
}

/** The companion renderer's webContents — the meeting-video peer connection lives there. */
export function getPipWebContents(): Electron.WebContents | undefined {
    return getHudWindow("companion")?.webContents;
}

/** Relay a signaling/state message to the companion renderer (offer, ICE candidate, tiles, close). */
export function sendToPip(channel: string, payload?: unknown): void {
    const companion = getHudWindow("companion");
    if (companion && !companion.webContents.isDestroyed()) {
        companion.webContents.send(channel, payload);
    }
}
