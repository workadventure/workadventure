export type CompanionOverride = "auto" | "force-open" | "force-closed";

export type CompanionVisibilityState = {
    screenSharing?: boolean;
    /** False where no content-protected meeting bar can replace the panel during a share (Linux). */
    meetingBarAvailable?: boolean;
    mainWindowFocused?: boolean;
    pipActive?: boolean;
    invitationPending?: boolean;
    inWorld?: boolean;
    autoOpenLatch?: boolean;
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
export function latchAfterMainWindowBlur(latch: boolean, presence: CompanionPresenceEdge): boolean;
export function leftWorld(previous: CompanionPresenceEdge, next: CompanionPresenceEdge): boolean;
