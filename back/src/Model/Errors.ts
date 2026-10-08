/**
 * Custom error thrown when a state transition is aborted.
 * Used to distinguish intentional aborts from other errors.
 */
export class TransitionAbortedError extends Error {
    constructor(message = "Transition aborted") {
        super(message);
        this.name = "TransitionAbortedError";
    }
}

/**
 * Thrown when the admin answers a map details query with an error page (sent with HTTP 200, e.g. a deleted room) or a
 * redirect instead of a map: the room URL does not resolve to a room. It is an answer, not a defect.
 */
export class RoomNotResolvedError extends Error {
    constructor(roomUrl: string, answer: unknown) {
        super(`Room "${roomUrl}" does not resolve to a map. Admin answer: ${JSON.stringify(answer)}`);
        this.name = "RoomNotResolvedError";
    }
}
