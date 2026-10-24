import { screen, type BrowserWindow } from "electron";
import ElectronLog from "electron-log";
import { closeHudWindow, getHudWindow, isHudWindowOpen } from "./hud-windows";
import { getPresenceSnapshot, onPresenceChange } from "./presence";
import { getWindow } from "./window";
import { getControllingWorldContents } from "./tab-manager";
import { companionMode } from "./companion-visibility-policy";
import { companionAutoOpenDisplay } from "./share-surfaces-policy";
import { canHideWindowsFromCapture } from "./platform-capture-policy";
import { shouldProtectWindowFromCapture } from "./content-protection";
import { isIdentifyingScreens } from "./screen-identify";
import { openChildWindow } from "./child-windows";

/**
 * Drives the Companion — the People / Chat / meeting video window — and is the only place that
 * decides when it opens and closes (rules in companion-visibility-policy). The world page reports
 * facts through presence, opens the window when asked (child-windows) and moves the meeting video
 * into it when told to (`app:windows:meeting-wanted`): while the companion is open during a meeting.
 */

// Automatic opens wait this long so a quick away-and-back doesn't flash the panel. Manual opens don't.
const OPEN_DEBOUNCE_MS = 400;
// `inWorld` also dips false while a same-world scene reloads (a portal hop), so the leaving-a-world
// teardown waits this long to be contradicted. Without it every portal would kill a live meeting.
const LEAVE_WORLD_GRACE_MS = 1500;

let started = false;
let opening = false;
// How the companion currently open was opened ("no" while closed).
let opened: "no" | "auto" | "manual" = "no";
let openTimer: ReturnType<typeof setTimeout> | undefined;
let leaveWorldTimer: ReturnType<typeof setTimeout> | undefined;
// The world page is hidden: WA fully covered (tracked on macOS and Windows) or minimized.
let pageHidden = false;
// The screen in the user's own screen share, when known (a whole screen is shared).
let sharedScreenDisplayId: number | undefined;
// Closed by the user since they last came back to WA.
let dismissed = false;
// Last `app:windows:meeting-wanted` sent to the world page.
let videoWanted = false;
// Companion windows closed by this controller, as opposed to by the user (window close shortcut).
const closedByController = new WeakSet<BrowserWindow>();
const watchedWindows = new WeakSet<BrowserWindow>();

function isMainWindowFocused(): boolean {
    const mainWindow = getWindow();
    return Boolean(mainWindow && !mainWindow.isDestroyed() && mainWindow.isFocused());
}

function isMainWindowShowing(): boolean {
    const mainWindow = getWindow();
    return (
        Boolean(mainWindow && !mainWindow.isDestroyed() && mainWindow.isVisible() && !mainWindow.isMinimized()) &&
        !pageHidden
    );
}

function cursorDisplayId(): number {
    return screen.getDisplayNearestPoint(screen.getCursorScreenPoint()).id;
}

/** The screen the companion opens on by itself, if any (see companionAutoOpenDisplay). */
function autoOpenDisplayId(): number | undefined {
    return companionAutoOpenDisplay({
        canHideFromCapture: canHideWindowsFromCapture(process.platform),
        sharing: getPresenceSnapshot().screenSharing,
        identifyingScreens: isIdentifyingScreens(),
        displayIds: screen.getAllDisplays().map((display) => display.id),
        sharedDisplayId: sharedScreenDisplayId,
        pointerDisplayId: cursorDisplayId(),
    });
}

/** The world tells which screen the user shares (undefined: none, a window, or unknown). */
export function setSharedScreenDisplay(displayId: number | undefined): void {
    sharedScreenDisplayId = displayId;
    updateCompanion();
}

function wantedMode(): "closed" | "auto" | "manual" {
    const p = getPresenceSnapshot();
    return companionMode({
        opened,
        // Still in the world during the portal-hop grace period.
        inWorld: p.inWorld || leaveWorldTimer !== undefined,
        inMeeting: p.inMeeting,
        invitationPending: p.invitationPending,
        autoOpenAllowed: p.autoOpenAllowed,
        waShowing: isMainWindowShowing(),
        dismissed,
        placeAvailable: autoOpenDisplayId() !== undefined,
    });
}

/**
 * The viewers of the user's screen share must not see the companion (their own faces, the chat):
 * it is kept out of the capture while the user shares, where the system allows it (macOS, Windows).
 */
function protectFromCaptureWhileSharing(): void {
    const companion = getHudWindow("companion");
    if (!companion) {
        return;
    }
    try {
        companion.setContentProtection(getPresenceSnapshot().screenSharing && shouldProtectWindowFromCapture());
    } catch (error) {
        ElectronLog.warn("Companion setContentProtection failed", error);
    }
}

/** Tell the world page whether to show the meeting video in the companion. */
function syncMeetingVideo(): void {
    const wanted = opened !== "no" && !opening && isHudWindowOpen("companion") && getPresenceSnapshot().inMeeting;
    if (wanted === videoWanted) {
        return;
    }
    videoWanted = wanted;
    getControllingWorldContents()?.send("app:windows:meeting-wanted", wanted);
}

function closeCompanionWindow(): void {
    opened = "no";
    const companion = getHudWindow("companion");
    if (companion) {
        closedByController.add(companion);
    }
    closeHudWindow("companion");
}

/** The user closing the window themselves (close shortcut) dismisses it like its close button. */
function watchUserClose(): void {
    const companion = getHudWindow("companion");
    if (!companion || watchedWindows.has(companion)) {
        return;
    }
    watchedWindows.add(companion);
    companion.once("closed", () => {
        if (!closedByController.has(companion)) {
            dismissCompanion();
        }
    });
}

function cancelPendingOpen(): void {
    if (openTimer !== undefined) {
        clearTimeout(openTimer);
        openTimer = undefined;
    }
}

function cancelPendingLeaveWorld(): void {
    if (leaveWorldTimer !== undefined) {
        clearTimeout(leaveWorldTimer);
        leaveWorldTimer = undefined;
    }
}

function performOpen(mode: "auto" | "manual"): void {
    if (opening || isHudWindowOpen("companion")) {
        return;
    }
    // Re-check under current conditions: the debounce delay may have raced.
    if (wantedMode() !== mode) {
        return;
    }
    opened = mode;
    opening = true;
    const automatic = mode === "auto" && !getPresenceSnapshot().invitationPending;
    const displayId = (automatic ? autoOpenDisplayId() : undefined) ?? cursorDisplayId();
    openChildWindow("companion", displayId)
        .then(() => {
            opening = false;
            watchUserClose();
            updateCompanion();
        })
        .catch((error) => {
            opening = false;
            opened = "no";
            ElectronLog.warn("Failed to open companion panel", error);
        });
}

function handlePresenceChange(): void {
    if (getPresenceSnapshot().inWorld) {
        cancelPendingLeaveWorld();
    } else if (isHudWindowOpen("companion") && leaveWorldTimer === undefined) {
        // Debounced: a portal hop briefly drops inWorld too. If the world comes back before the
        // timer fires, nothing happens; otherwise the companion closes, whoever opened it.
        leaveWorldTimer = setTimeout(() => {
            leaveWorldTimer = undefined;
            dismissed = false;
            updateCompanion();
        }, LEAVE_WORLD_GRACE_MS);
    }
    updateCompanion();
}

/** The main window got minimized or hidden. */
export function onMainWindowHidden(): void {
    updateCompanion();
}

/**
 * The world page went hidden (WA minimized, or fully covered: tracked on macOS and Windows) or
 * showed again. A page hidden in a focused window is a tab switch inside WA, not leaving it.
 */
export function onPageVisibilityChange(hidden: boolean): void {
    if (hidden && (isMainWindowFocused() || isIdentifyingScreens())) {
        return;
    }
    pageHidden = hidden;
    updateCompanion();
}

export function onMainWindowFocus(): void {
    pageHidden = false;
    updateCompanion();
}

export function updateCompanion(): void {
    protectFromCaptureWhileSharing();
    // Coming back to WA lifts a close by hand: leaving it again reopens the companion.
    if (isMainWindowShowing()) {
        dismissed = false;
    }

    const mode = wantedMode();
    const isOpen = isHudWindowOpen("companion");

    if (mode === "closed") {
        cancelPendingOpen();
        if (isOpen) {
            closeCompanionWindow();
        }
    } else if (!isOpen && !opening && openTimer === undefined) {
        if (mode === "manual") {
            performOpen("manual");
        } else {
            openTimer = setTimeout(() => {
                openTimer = undefined;
                performOpen("auto");
            }, OPEN_DEBOUNCE_MS);
        }
    }
    syncMeetingVideo();
}

/** Tray, global shortcut, and the world's PiP button: open by hand, or close by hand. */
export function toggleCompanion(): void {
    if (isHudWindowOpen("companion")) {
        dismissCompanion();
        return;
    }
    cancelPendingOpen();
    dismissed = false;
    opened = "manual";
    updateCompanion();
}

/** Opened by hand from WA's profile menu, the Dock menu or the taskbar task: never closes it, unlike the toggle. */
export function openCompanion(): void {
    cancelPendingOpen();
    dismissed = false;
    // An open companion becomes one opened by hand: it stays when WA shows again.
    opened = "manual";
    getHudWindow("companion")?.showInactive();
    updateCompanion();
}

/** Closed by hand (its close button, the window close, the tray): until the user comes back to WA. */
export function dismissCompanion(): void {
    dismissed = true;
    closeCompanionWindow();
    updateCompanion();
}

export function isCompanionVisible(): boolean {
    return isHudWindowOpen("companion");
}

/** Start reacting to presence changes. Focus and visibility updates are pushed in from window.ts and ipc.ts. */
export function startCompanionController(): void {
    if (started) {
        return;
    }
    started = true;
    onPresenceChange(handlePresenceChange);
    updateCompanion();
}

/** Close the panel and reset (used on tab switch, world change and window teardown). */
export function stopCompanion(): void {
    cancelPendingOpen();
    cancelPendingLeaveWorld();
    dismissed = false;
    closeCompanionWindow();
    syncMeetingVideo();
}
