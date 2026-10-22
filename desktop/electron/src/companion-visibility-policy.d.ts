export type CompanionMode = "closed" | "auto" | "manual";

export type CompanionState = {
    /** How the companion currently open was opened. */
    opened?: "no" | "auto" | "manual";
    inWorld?: boolean;
    inMeeting?: boolean;
    invitationPending?: boolean;
    /** The "Allow picture-in-picture" setting. */
    autoOpenAllowed?: boolean;
    /** WA shows: not minimized, hidden or fully covered. */
    waShowing?: boolean;
    /** Closed by the user since they last came back to WA. */
    dismissed?: boolean;
    /** Somewhere to open by itself (see displayForAutoOpenDuringShare). */
    placeAvailable?: boolean;
};

export function companionMode(state: CompanionState): CompanionMode;
export function displayForAutoOpenDuringShare(
    displayIds: number[],
    sharedDisplayId: number | undefined,
    preferredDisplayId: number
): number | undefined;
