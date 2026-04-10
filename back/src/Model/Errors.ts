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
