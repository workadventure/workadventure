/**
 * Errors related to variable handling.
 */
export class VariableError extends Error {
    constructor(message: string) {
        super(message);
        Object.setPrototypeOf(this, VariableError.prototype);
    }
}
