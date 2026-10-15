export type CompanionOverride = "auto" | "force-open" | "force-closed";

export type CompanionVisibilityState = {
    /** WA shows: not minimized, hidden or fully covered. */
    mainWindowInView?: boolean;
    pipActive?: boolean;
    invitationPending?: boolean;
    inWorld?: boolean;
    autoOpenLatch?: boolean;
    /** False when the companion has nowhere to open by itself (see displayForAutoOpenDuringShare). */
    autoOpenAllowed?: boolean;
    override?: CompanionOverride;
};

export type CompanionPresenceEdge = {
    inWorld?: boolean;
    inMeeting?: boolean;
};

export function shouldShowCompanion(state: CompanionVisibilityState): boolean;
export function latchAfterPresenceChange(
    latch: boolean,
    previous: CompanionPresenceEdge,
    next: CompanionPresenceEdge
): boolean;
export function latchAfterLeavingApp(latch: boolean, presence: CompanionPresenceEdge): boolean;
export function dismissalAfterPresenceChange(
    dismissed: boolean,
    previous: CompanionPresenceEdge,
    next: CompanionPresenceEdge
): boolean;
export function displayForAutoOpenDuringShare(
    displayIds: number[],
    sharedDisplayId: number | undefined,
    preferredDisplayId: number
): number | undefined;
export function leftWorld(previous: CompanionPresenceEdge, next: CompanionPresenceEdge): boolean;
