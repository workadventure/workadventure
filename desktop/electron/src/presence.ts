/**
 * Single source of truth for the user's live presence, aggregated from two sources:
 *   - the renderer (in-meeting / mic / camera), pushed via `app:setPresence`;
 *   - the main process idle monitor (see idle-monitor.ts), pushed via setIdle().
 *
 * The tray reflects the effective status (meeting > idle > available) as a colored dot and
 * mirrors the mic/camera booleans into its quick-action checkmarks. Kept deliberately dumb: it
 * holds state and fans out a change event; consumers decide what to render.
 */

export type TrayStatus = "meeting" | "idle" | "available";

/**
 * The four user-selectable availability statuses, as stable string keys. Kept as strings (not the
 * numeric AvailabilityStatus enum) so the main process needs no dependency on @workadventure/messages
 * — the renderer maps to/from the enum on its side.
 */
export type TrayAvailability = "online" | "busy" | "back_in_a_moment" | "do_not_disturb";

type PresenceState = {
    inMeeting: boolean;
    micEnabled: boolean;
    cameraEnabled: boolean;
    screenSharing: boolean;
    idle: boolean;
    /** True while a game scene is loaded (the user is actually in a world, not on landing/login). */
    inWorld: boolean;
    /** True while a meeting invitation is pending — the companion force-opens to show its banner. */
    invitationPending: boolean;
    /** The user's current chosen availability (the tray Status radio reflects this). */
    requestedStatus: TrayAvailability;
    /** True while WA locks the status bar (in a meeting / silent zone) — the tray submenu grays out. */
    statusLocked: boolean;
};

const state: PresenceState = {
    inMeeting: false,
    micEnabled: false,
    cameraEnabled: false,
    screenSharing: false,
    idle: false,
    inWorld: false,
    invitationPending: false,
    requestedStatus: "online",
    statusLocked: false,
};

const TRAY_AVAILABILITY_VALUES: readonly TrayAvailability[] = [
    "online",
    "busy",
    "back_in_a_moment",
    "do_not_disturb",
];

function coerceAvailability(value: unknown): TrayAvailability {
    return typeof value === "string" && (TRAY_AVAILABILITY_VALUES as readonly string[]).includes(value)
        ? (value as TrayAvailability)
        : "online";
}

const listeners = new Set<() => void>();

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

/** Renderer-sourced presence (in-meeting + media + availability). Emits only on a real change. */
export function setRendererPresence(next: {
    inMeeting?: boolean;
    micEnabled?: boolean;
    cameraEnabled?: boolean;
    screenSharing?: boolean;
    inWorld?: boolean;
    invitationPending?: boolean;
    requestedStatus?: unknown;
    statusLocked?: boolean;
}): void {
    const inMeeting = Boolean(next.inMeeting);
    const micEnabled = Boolean(next.micEnabled);
    const cameraEnabled = Boolean(next.cameraEnabled);
    const screenSharing = Boolean(next.screenSharing);
    const inWorld = Boolean(next.inWorld);
    const invitationPending = Boolean(next.invitationPending);
    const requestedStatus = coerceAvailability(next.requestedStatus);
    const statusLocked = Boolean(next.statusLocked);
    if (
        state.inMeeting === inMeeting &&
        state.micEnabled === micEnabled &&
        state.cameraEnabled === cameraEnabled &&
        state.screenSharing === screenSharing &&
        state.inWorld === inWorld &&
        state.invitationPending === invitationPending &&
        state.requestedStatus === requestedStatus &&
        state.statusLocked === statusLocked
    ) {
        return;
    }
    state.inMeeting = inMeeting;
    state.micEnabled = micEnabled;
    state.cameraEnabled = cameraEnabled;
    state.screenSharing = screenSharing;
    state.inWorld = inWorld;
    state.invitationPending = invitationPending;
    state.requestedStatus = requestedStatus;
    state.statusLocked = statusLocked;
    emit();
}

/** Main-sourced idle flag (from the powerMonitor idle monitor). Emits only on a real change. */
export function setIdle(idle: boolean): void {
    if (state.idle === Boolean(idle)) {
        return;
    }
    state.idle = Boolean(idle);
    emit();
}

/** Effective tray status: an active meeting outranks idle, which outranks the available default. */
export function getTrayStatus(): TrayStatus {
    if (state.inMeeting) {
        return "meeting";
    }
    if (state.idle) {
        return "idle";
    }
    return "available";
}

export function getMediaState(): { micEnabled: boolean; cameraEnabled: boolean; inMeeting: boolean } {
    return { micEnabled: state.micEnabled, cameraEnabled: state.cameraEnabled, inMeeting: state.inMeeting };
}

/** The user's chosen availability + whether WA currently locks it (tray Status submenu). */
export function getAvailabilityInfo(): { status: TrayAvailability; locked: boolean } {
    return { status: state.requestedStatus, locked: state.statusLocked };
}

/** Snapshot used by the companion visibility controller. */
export function getPresenceSnapshot(): {
    inMeeting: boolean;
    micEnabled: boolean;
    cameraEnabled: boolean;
    screenSharing: boolean;
    inWorld: boolean;
    invitationPending: boolean;
} {
    return {
        inMeeting: state.inMeeting,
        micEnabled: state.micEnabled,
        cameraEnabled: state.cameraEnabled,
        screenSharing: state.screenSharing,
        inWorld: state.inWorld,
        invitationPending: state.invitationPending,
    };
}
