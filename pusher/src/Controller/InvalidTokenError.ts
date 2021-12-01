/**
 * Errors related to variable handling.
 */
export class InvalidTokenError extends Error {
    constructor(message: string) {
        super(message);
        Object.setPrototypeOf(this, InvalidTokenError.prototype);
    }
}
