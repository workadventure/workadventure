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

type PresenceState = {
    inMeeting: boolean;
    micEnabled: boolean;
    cameraEnabled: boolean;
    idle: boolean;
};

const state: PresenceState = {
    inMeeting: false,
    micEnabled: false,
    cameraEnabled: false,
    idle: false,
};

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

/** Renderer-sourced presence (in-meeting + media state). Emits only on a real change. */
export function setRendererPresence(next: {
    inMeeting?: boolean;
    micEnabled?: boolean;
    cameraEnabled?: boolean;
}): void {
    const inMeeting = Boolean(next.inMeeting);
    const micEnabled = Boolean(next.micEnabled);
    const cameraEnabled = Boolean(next.cameraEnabled);
    if (state.inMeeting === inMeeting && state.micEnabled === micEnabled && state.cameraEnabled === cameraEnabled) {
        return;
    }
    state.inMeeting = inMeeting;
    state.micEnabled = micEnabled;
    state.cameraEnabled = cameraEnabled;
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
