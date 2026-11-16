import type { DesktopPresence, DesktopStatus } from "@workadventure/desktop-api";

/**
 * Single source of truth for the user's live presence, pushed by the renderer via `app:setPresence`.
 *
 * The tray shows the user's status as WorkAdventure shows it (its name and dot color) and mirrors the
 * mic/camera booleans into its quick-action checkmarks. Kept deliberately dumb: it holds state and fans
 * out a change event; consumers decide what to render.
 */

/** What the renderer pushes. No status until the page has sent a valid one. */
type PresenceState = Required<Omit<DesktopPresence, "status">> & { status: DesktopStatus | undefined };

const state: PresenceState = {
    inMeeting: false,
    withOthers: false,
    micEnabled: false,
    cameraEnabled: false,
    screenSharing: false,
    inWorld: false,
    onboarding: false,
    invitationPending: false,
    autoOpenAllowed: true,
    status: undefined,
};

/** The page's status, if it is a label and a 0xRRGGBB color. The label is cut to fit a menu. */
export function coerceStatus(value: unknown): DesktopStatus | undefined {
    if (!value || typeof value !== "object") {
        return undefined;
    }
    const { label, color } = value as Record<string, unknown>;
    if (typeof label !== "string" || typeof color !== "number" || !Number.isInteger(color)) {
        return undefined;
    }
    if (color < 0 || color > 0xffffff) {
        return undefined;
    }
    return { label: label.slice(0, 100), color };
}

const listeners = new Set<() => void>();

// When each renderer last reported its presence, by webContents id. Only a world whose front reports
// presence can be judged by the reach-the-world watchdog: an older WorkAdventure front never does.
const lastPresenceReportAt = new Map<number, number>();

export function notePresenceReport(webContentsId: number): void {
    lastPresenceReportAt.set(webContentsId, Date.now());
}

export function hasReportedPresenceSince(webContentsId: number, since: number): boolean {
    return (lastPresenceReportAt.get(webContentsId) ?? 0) >= since;
}

function emit(): void {
    for (const listener of listeners) {
        try {
            listener();
        } catch {
            /* a broken listener must not stop the others */
        }
    }
}

/** Subscribe to any presence change. Returns an unsubscriber. */
export function onPresenceChange(listener: () => void): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
}

/** Renderer-sourced presence (in-meeting + media + status). Emits only on a real change. */
export function setRendererPresence(next: {
    inMeeting?: boolean;
    withOthers?: boolean;
    micEnabled?: boolean;
    cameraEnabled?: boolean;
    screenSharing?: boolean;
    inWorld?: boolean;
    onboarding?: boolean;
    invitationPending?: boolean;
    autoOpenAllowed?: boolean;
    status?: unknown;
}): void {
    const inMeeting = Boolean(next.inMeeting);
    const withOthers = Boolean(next.withOthers);
    const micEnabled = Boolean(next.micEnabled);
    const cameraEnabled = Boolean(next.cameraEnabled);
    const screenSharing = Boolean(next.screenSharing);
    const inWorld = Boolean(next.inWorld);
    const onboarding = Boolean(next.onboarding);
    const invitationPending = Boolean(next.invitationPending);
    const autoOpenAllowed = next.autoOpenAllowed !== false;
    const status = coerceStatus(next.status);
    if (
        state.inMeeting === inMeeting &&
        state.withOthers === withOthers &&
        state.micEnabled === micEnabled &&
        state.cameraEnabled === cameraEnabled &&
        state.screenSharing === screenSharing &&
        state.inWorld === inWorld &&
        state.onboarding === onboarding &&
        state.invitationPending === invitationPending &&
        state.autoOpenAllowed === autoOpenAllowed &&
        state.status?.label === status?.label &&
        state.status?.color === status?.color
    ) {
        return;
    }
    state.inMeeting = inMeeting;
    state.withOthers = withOthers;
    state.micEnabled = micEnabled;
    state.cameraEnabled = cameraEnabled;
    state.screenSharing = screenSharing;
    state.inWorld = inWorld;
    state.onboarding = onboarding;
    state.invitationPending = invitationPending;
    state.autoOpenAllowed = autoOpenAllowed;
    state.status = status;
    emit();
}

/**
 * Reset to the disconnected baseline. Called when the main window is closed: the renderer that feeds
 * presence is gone, so without this the tray would keep showing the last status (e.g. a green
 * "online" dot while no window is even connected). The tray then falls back to "offline".
 */
export function resetPresence(): void {
    state.inMeeting = false;
    state.withOthers = false;
    state.micEnabled = false;
    state.cameraEnabled = false;
    state.screenSharing = false;
    state.inWorld = false;
    state.onboarding = false;
    state.invitationPending = false;
    state.autoOpenAllowed = true;
    state.status = undefined;
    emit();
}

/**
 * The user's status in WorkAdventure, or undefined outside a world (landing / login, or the window is
 * closed), where there is none: the tray then shows "offline" rather than a stale status.
 */
export function getStatus(): DesktopStatus | undefined {
    return state.inWorld ? state.status : undefined;
}

export function getMediaState(): { micEnabled: boolean; cameraEnabled: boolean; inMeeting: boolean } {
    return { micEnabled: state.micEnabled, cameraEnabled: state.cameraEnabled, inMeeting: state.inMeeting };
}

/** Snapshot used by the mini window visibility controller. */
export function getPresenceSnapshot(): {
    inMeeting: boolean;
    withOthers: boolean;
    micEnabled: boolean;
    cameraEnabled: boolean;
    screenSharing: boolean;
    inWorld: boolean;
    onboarding: boolean;
    invitationPending: boolean;
    autoOpenAllowed: boolean;
} {
    return {
        inMeeting: state.inMeeting,
        withOthers: state.withOthers,
        micEnabled: state.micEnabled,
        cameraEnabled: state.cameraEnabled,
        screenSharing: state.screenSharing,
        inWorld: state.inWorld,
        onboarding: state.onboarding,
        invitationPending: state.invitationPending,
        autoOpenAllowed: state.autoOpenAllowed,
    };
}
