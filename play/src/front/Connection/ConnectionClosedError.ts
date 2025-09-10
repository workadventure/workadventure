export class ConnectionClosedError extends Error {
    constructor(message?: string) {
        super(message);
        this.name = "ConnectionClosedError";
        // Set the prototype explicitly to maintain the correct prototype chain
        Object.setPrototypeOf(this, ConnectionClosedError.prototype);
    }
}
