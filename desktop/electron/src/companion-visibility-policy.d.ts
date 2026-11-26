export type CompanionMode = "closed" | "auto" | "manual";

export type CompanionState = {
    /** How the companion currently open was opened. */
    opened?: "no" | "auto" | "manual";
    inWorld?: boolean;
    inMeeting?: boolean;
    invitationPending?: boolean;
    /** The "Allow picture-in-picture" setting. */
    autoOpenAllowed?: boolean;
    /** WA shows: not minimized, hidden, left (focus) or page hidden. */
    waShowing?: boolean;
    /** Closed by the user since they last came back to WA. */
    dismissed?: boolean;
    /** Somewhere to open by itself (see companionAutoOpenDisplay). */
    placeAvailable?: boolean;
};

export function companionMode(state: CompanionState): CompanionMode;

export function leftOnBlur(blur: {
    positionsKnown?: boolean;
    pointerDisplayId?: number;
    waDisplayId?: number;
}): boolean;
