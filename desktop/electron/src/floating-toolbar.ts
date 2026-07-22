import { screen } from "electron";
import ElectronLog from "electron-log";
import { closeHudWindow, isHudWindowOpen, openHudWindow, sendHudState } from "./hud-windows";
import { getPresenceSnapshot, onPresenceChange } from "./presence";
import { getWindow } from "./window";

/**
 * Drives the floating meeting toolbar — a compact Mute / Camera / Back-to-app pill that appears
 * when the user is in a call but has tabbed away from WorkAdventure, so they can toggle mic/camera
 * without alt-tabbing back. Entirely main-managed: visibility comes from the presence signal the
 * renderer already pushes (in-meeting + media state) plus the main window's focus, and its
 * commands are handled in the main process (emitMuteToggle / emitCameraToggle / focus). It stays
 * hidden while screen sharing, where the shared-screen meeting bar already provides these controls.
 */

let opening = false;
let started = false;

function isMainWindowFocused(): boolean {
    const mainWindow = getWindow();
    return Boolean(mainWindow && !mainWindow.isDestroyed() && mainWindow.isFocused());
}

function shouldShow(): boolean {
    const p = getPresenceSnapshot();
    return p.inMeeting && !isMainWindowFocused() && !p.screenSharing;
}

function pushFloatingState(): void {
    const p = getPresenceSnapshot();
    sendHudState("floating-meeting", { micEnabled: p.micEnabled, cameraEnabled: p.cameraEnabled });
}

export function updateFloatingToolbar(): void {
    const wantOpen = shouldShow();
    const isOpen = isHudWindowOpen("floating-meeting");

    if (wantOpen && !isOpen) {
        if (opening) {
            return;
        }
        opening = true;
        // Open on the display the user is actually looking at (cursor), not necessarily the WA one.
        const display = screen.getDisplayNearestPoint(screen.getCursorScreenPoint());
        openHudWindow("floating-meeting", display.id)
            .then(() => {
                opening = false;
                // The user may have refocused WA / left the call / started sharing while we opened.
                if (!shouldShow()) {
                    closeHudWindow("floating-meeting");
                    return;
                }
                pushFloatingState();
            })
            .catch((error) => {
                opening = false;
                ElectronLog.warn("Failed to open floating meeting toolbar", error);
            });
        return;
    }

    if (!wantOpen && isOpen) {
        closeHudWindow("floating-meeting");
        return;
    }

    if (wantOpen && isOpen) {
        pushFloatingState();
    }
}

/** Start reacting to presence changes. Focus changes are pushed in from window.ts. */
export function startFloatingToolbarController(): void {
    if (started) {
        return;
    }
    started = true;
    onPresenceChange(updateFloatingToolbar);
    updateFloatingToolbar();
}

export function stopFloatingToolbar(): void {
    closeHudWindow("floating-meeting");
}
