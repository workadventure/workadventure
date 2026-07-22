import { screen } from "electron";
import ElectronLog from "electron-log";
import { closeHudWindow, isHudWindowOpen, openHudWindow } from "./hud-windows";
import { getPresenceSnapshot, onPresenceChange } from "./presence";
import { getWindow } from "./window";

/**
 * Drives the companion panel — the compact People / Chat / Controls / Mentions window shown when
 * WorkAdventure is backgrounded. It auto-shows when the main window is unfocused AND the user is in
 * a meeting or has unread mentions (and is not screen sharing, where the presenter HUD already
 * carries the controls). The tray item and the optional global shortcut toggle it manually; a
 * manual choice sticks for the current away-session and reverts to auto once the meeting ends and
 * mentions clear. Entirely main-managed — the active world renderer only feeds its content.
 */

type Override = "auto" | "force-open" | "force-closed";

let started = false;
let opening = false;
let override: Override = "auto";
let unreadCount = 0;
let wasTriggered = false;

function isMainWindowFocused(): boolean {
    const mainWindow = getWindow();
    return Boolean(mainWindow && !mainWindow.isDestroyed() && mainWindow.isFocused());
}

/** The conditions that make the panel auto-relevant (independent of focus / manual override). */
function triggersPresent(): boolean {
    const p = getPresenceSnapshot();
    return p.inMeeting || unreadCount > 0;
}

function shouldAutoShow(): boolean {
    const p = getPresenceSnapshot();
    if (isMainWindowFocused() || p.screenSharing) {
        return false;
    }
    return p.inMeeting || unreadCount > 0;
}

function wantOpen(): boolean {
    if (override === "force-open") {
        return true;
    }
    if (override === "force-closed") {
        return false;
    }
    return shouldAutoShow();
}

export function updateCompanion(): void {
    // Once an away-session's triggers subside (meeting ended + mentions cleared), drop any manual
    // override so auto-show governs again the next time the user is away.
    const triggered = triggersPresent();
    if (wasTriggered && !triggered) {
        override = "auto";
    }
    wasTriggered = triggered;

    const want = wantOpen();
    const isOpen = isHudWindowOpen("companion");

    if (want && !isOpen) {
        if (opening) {
            return;
        }
        opening = true;
        // Open on the display the user is actually looking at (cursor), not necessarily WA's.
        const display = screen.getDisplayNearestPoint(screen.getCursorScreenPoint());
        openHudWindow("companion", display.id)
            .then(() => {
                opening = false;
                // Conditions may have changed while we opened (refocus / meeting left / manual close).
                if (!wantOpen()) {
                    closeHudWindow("companion");
                }
            })
            .catch((error) => {
                opening = false;
                ElectronLog.warn("Failed to open companion panel", error);
            });
        return;
    }
    if (!want && isOpen) {
        closeHudWindow("companion");
    }
}

/** Toggle from the tray / global shortcut: force the opposite of the current visibility. */
export function toggleCompanion(): void {
    override = isHudWindowOpen("companion") ? "force-closed" : "force-open";
    updateCompanion();
}

/**
 * Dismiss from the panel's own close button. Goes through the override (unlike a bare close) so the
 * panel stays closed for the rest of the away-session instead of re-opening on the next presence
 * change while the meeting / mentions trigger is still active.
 */
export function dismissCompanion(): void {
    override = "force-closed";
    updateCompanion();
}

export function isCompanionVisible(): boolean {
    return isHudWindowOpen("companion");
}

/** Latest total unread mention count (pushed from the renderer via the badge path). */
export function setCompanionUnread(count: number): void {
    const next = Number.isFinite(count) && count > 0 ? Math.floor(count) : 0;
    if (next === unreadCount) {
        return;
    }
    unreadCount = next;
    updateCompanion();
}

/** Start reacting to presence changes. Focus/blur updates are pushed in from window.ts. */
export function startCompanionController(): void {
    if (started) {
        return;
    }
    started = true;
    onPresenceChange(updateCompanion);
    updateCompanion();
}

/** Close the panel and reset to auto (used on tab switch and window teardown). */
export function stopCompanion(): void {
    override = "auto";
    wasTriggered = false;
    closeHudWindow("companion");
}
