import { app, BrowserWindow, screen } from "electron";
import ElectronLog from "electron-log";
import { closeHudWindow, getHudWindow, isHudWindowOpen } from "./hud-windows";
import { getPresenceSnapshot, onPresenceChange } from "./presence";
import { getWindow } from "./window";
import { getControllingWorldContents } from "./tab-manager";
import { leftOnBlur, miniWindowMode } from "./mini-window-visibility-policy";
import { miniWindowAutoOpenDisplay } from "./share-surfaces-policy";
import { canHideWindowsFromCapture, usesSystemScreenSharePicker } from "./platform-capture-policy";
import { shouldProtectWindowFromCapture } from "./content-protection";
import { isIdentifyingScreens } from "./screen-identify";
import { openChildWindow } from "./child-windows";

/**
 * Drives the mini window — the People / Chat / meeting video window — and is the only place that
 * decides when it opens and closes (rules in mini-window-visibility-policy). The world page reports
 * facts through presence, opens the window when asked (child-windows) and moves the meeting video
 * into it when told to (`app:windows:meeting-wanted`): while the mini window is open during a meeting.
 */

// Automatic opens wait this long so a quick away-and-back doesn't flash the panel. Manual opens don't.
const OPEN_DEBOUNCE_MS = 400;
// `inWorld` also dips false while a same-world scene reloads (a portal hop), so the leaving-a-world
// teardown waits this long to be contradicted. Without it every portal would kill a live meeting.
const LEAVE_WORLD_GRACE_MS = 1500;

let started = false;
let opening = false;
// How the mini window currently open was opened ("no" while closed).
let opened: "no" | "auto" | "manual" = "no";
let openTimer: ReturnType<typeof setTimeout> | undefined;
let leaveWorldTimer: ReturnType<typeof setTimeout> | undefined;
// The world page is hidden: WA fully covered (tracked on macOS and Windows) or minimized.
let pageHidden = false;
// The focus left the app while WA was considered left (see leftOnBlur). Detecting WA fully covered
// is unreliable and the app is rarely minimized, so this is the main signal. Only raised by a focus
// loss; only WA's focus, restore or show lower it.
let leftApp = false;
// The screen in the user's own screen share, when known (a whole screen is shared).
let sharedScreenDisplayId: number | undefined;
// Closed by the user since they last came back to WA.
let dismissed = false;
// Last `app:windows:meeting-wanted` sent to the world page.
let videoWanted = false;
// Mini windows closed by this controller, as opposed to by the user (window close shortcut).
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
        !pageHidden &&
        !leftApp
    );
}

/** The signals behind the decision, for the diagnostic log (no world, user or window names). */
function signalsForLog(): string {
    const mainWindow = getWindow();
    const alive = Boolean(mainWindow && !mainWindow.isDestroyed());
    const flags = {
        minimized: alive && mainWindow ? mainWindow.isMinimized() : false,
        hidden: alive && mainWindow ? !mainWindow.isVisible() : false,
        leftApp,
        pageHidden,
        withOthers: Boolean(getPresenceSnapshot().withOthers),
    };
    return [
        ...Object.entries(flags).map(([name, value]) => `${name}=${String(value)}`),
        `platform=${process.platform}`,
    ].join(" ");
}

function cursorDisplayId(): number {
    return screen.getDisplayNearestPoint(screen.getCursorScreenPoint()).id;
}

/** The screen the mini window opens on by itself, if any (see miniWindowAutoOpenDisplay). */
function autoOpenDisplayId(): number | undefined {
    return miniWindowAutoOpenDisplay({
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
    updateMiniWindow();
}

function wantedMode(): "closed" | "auto" | "manual" {
    const p = getPresenceSnapshot();
    return miniWindowMode({
        opened,
        // Still in the world during the portal-hop grace period.
        inWorld: p.inWorld || leaveWorldTimer !== undefined,
        withOthers: p.withOthers,
        invitationPending: p.invitationPending,
        autoOpenAllowed: p.autoOpenAllowed,
        waShowing: isMainWindowShowing(),
        dismissed,
        placeAvailable: autoOpenDisplayId() !== undefined,
    });
}

/**
 * The viewers of the user's screen share must not see the mini window (their own faces, the chat):
 * it is kept out of the capture while the user shares, where the system allows it (macOS, Windows).
 */
function protectFromCaptureWhileSharing(): void {
    const miniWindow = getHudWindow("mini-window");
    if (!miniWindow) {
        return;
    }
    try {
        miniWindow.setContentProtection(getPresenceSnapshot().screenSharing && shouldProtectWindowFromCapture());
    } catch (error) {
        ElectronLog.warn("Mini window setContentProtection failed", error);
    }
}

/** Tell the world page whether to show the meeting video in the mini window. */
function syncMeetingVideo(): void {
    const wanted = opened !== "no" && !opening && isHudWindowOpen("mini-window") && getPresenceSnapshot().inMeeting;
    if (wanted === videoWanted) {
        return;
    }
    videoWanted = wanted;
    getControllingWorldContents()?.send("app:windows:meeting-wanted", wanted);
}

function closeMiniWindow(): void {
    opened = "no";
    const miniWindow = getHudWindow("mini-window");
    if (miniWindow) {
        closedByController.add(miniWindow);
    }
    closeHudWindow("mini-window");
}

/** The user closing the window themselves (close shortcut) dismisses it like its close button. */
function watchUserClose(): void {
    const miniWindow = getHudWindow("mini-window");
    if (!miniWindow || watchedWindows.has(miniWindow)) {
        return;
    }
    watchedWindows.add(miniWindow);
    miniWindow.once("closed", () => {
        if (!closedByController.has(miniWindow)) {
            dismissMiniWindow();
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
    if (opening || isHudWindowOpen("mini-window")) {
        return;
    }
    // Re-check under current conditions: the debounce delay may have raced.
    if (wantedMode() !== mode) {
        return;
    }
    // The focus is still in one of the app's windows (meeting bar, overlay, mini window): not leaving
    // WA. Checked here, after the debounce, when the system has handed the focus over; leaving that
    // window for another app blurs it and arms a new debounce.
    if (mode === "auto" && BrowserWindow.getFocusedWindow() !== null) {
        return;
    }
    if (mode === "auto") {
        ElectronLog.info(`Mini window auto-open: ${signalsForLog()}`);
    }
    opened = mode;
    opening = true;
    const automatic = mode === "auto" && !getPresenceSnapshot().invitationPending;
    const displayId = (automatic ? autoOpenDisplayId() : undefined) ?? cursorDisplayId();
    openChildWindow("mini-window", displayId)
        .then(() => {
            opening = false;
            watchUserClose();
            updateMiniWindow();
        })
        .catch((error) => {
            opening = false;
            opened = "no";
            ElectronLog.warn("Failed to open mini window", error);
        });
}

function handlePresenceChange(): void {
    if (getPresenceSnapshot().inWorld) {
        cancelPendingLeaveWorld();
    } else if (isHudWindowOpen("mini-window") && leaveWorldTimer === undefined) {
        // Debounced: a portal hop briefly drops inWorld too. If the world comes back before the
        // timer fires, nothing happens; otherwise the mini window closes, whoever opened it.
        leaveWorldTimer = setTimeout(() => {
            leaveWorldTimer = undefined;
            dismissed = false;
            updateMiniWindow();
        }, LEAVE_WORLD_GRACE_MS);
    }
    updateMiniWindow();
}

/** The main window got minimized or hidden. */
export function onMainWindowHidden(): void {
    updateMiniWindow();
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
    updateMiniWindow();
}

/**
 * Any window of the app lost the focus (app-wide `browser-window-blur`), so focus moving between
 * WA, the mini window and the meeting bar is not leaving WA. Read synchronously: "Identify screens"
 * clears its state as soon as a screen is picked.
 */
function onAppWindowBlur(): void {
    const mainWindow = getWindow();
    if (!mainWindow || mainWindow.isDestroyed() || mainWindow.isFocused() || isIdentifyingScreens()) {
        return;
    }
    const positionsKnown = !usesSystemScreenSharePicker(process.platform, process.env);
    const pointerDisplayId = cursorDisplayId();
    const waDisplayId = screen.getDisplayMatching(mainWindow.getBounds()).id;
    const left = leftOnBlur({ positionsKnown, pointerDisplayId, waDisplayId });
    if (getPresenceSnapshot().withOthers) {
        ElectronLog.info(
            `Mini window blur: left=${String(left)} wayland=${String(
                !positionsKnown
            )} pointerDisplay=${pointerDisplayId} waDisplay=${waDisplayId}`
        );
    }
    // Raise only: focus moving on between the app's windows, or toward another screen, does not
    // bring WA back.
    if (left) {
        leftApp = true;
    }
    updateMiniWindow();
}

export function onMainWindowFocus(): void {
    pageHidden = false;
    leftApp = false;
    updateMiniWindow();
}

/** The main window was shown or restored: back on screen, even if the focus did not follow. */
export function onMainWindowShown(): void {
    leftApp = false;
    updateMiniWindow();
}

export function updateMiniWindow(): void {
    protectFromCaptureWhileSharing();
    // Coming back to WA lifts a close by hand: leaving it again reopens the mini window.
    if (isMainWindowShowing()) {
        dismissed = false;
    }

    const mode = wantedMode();
    const isOpen = isHudWindowOpen("mini-window");

    if (mode === "closed") {
        cancelPendingOpen();
        if (isOpen) {
            // Read before closing: closeMiniWindow() resets `opened`.
            if (opened === "auto") {
                ElectronLog.info(`Mini window auto-close: ${signalsForLog()}`);
            }
            closeMiniWindow();
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
export function toggleMiniWindow(): void {
    if (isHudWindowOpen("mini-window")) {
        dismissMiniWindow();
        return;
    }
    cancelPendingOpen();
    dismissed = false;
    opened = "manual";
    updateMiniWindow();
}

/** Opened by hand from WA's profile menu, the Dock menu or the taskbar task: never closes it, unlike the toggle. */
export function openMiniWindow(): void {
    cancelPendingOpen();
    dismissed = false;
    // An open mini window becomes one opened by hand: it stays when WA shows again.
    opened = "manual";
    getHudWindow("mini-window")?.showInactive();
    updateMiniWindow();
}

/** Closed by hand (its close button, the window close, the tray): until the user comes back to WA. */
export function dismissMiniWindow(): void {
    dismissed = true;
    closeMiniWindow();
    updateMiniWindow();
}

export function isMiniWindowVisible(): boolean {
    return isHudWindowOpen("mini-window");
}

/** Start reacting to presence changes. Focus and visibility updates are pushed in from window.ts and ipc.ts. */
export function startMiniWindowController(): void {
    if (started) {
        return;
    }
    started = true;
    onPresenceChange(handlePresenceChange);
    app.on("browser-window-blur", onAppWindowBlur);
    updateMiniWindow();
}

/** Close the panel and reset (used on tab switch, world change and window teardown). */
export function stopMiniWindow(): void {
    cancelPendingOpen();
    cancelPendingLeaveWorld();
    dismissed = false;
    closeMiniWindow();
    syncMeetingVideo();
}
