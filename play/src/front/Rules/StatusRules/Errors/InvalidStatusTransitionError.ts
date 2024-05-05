export class InvalidStatusTransitionError extends Error {
    constructor(msg: string) {
        super(msg);
    }
}
