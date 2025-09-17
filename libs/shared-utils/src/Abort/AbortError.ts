export class AbortError extends Error {
    constructor(message?: string, options?: { cause?: Error }) {
        super(message ?? "Abort message received", options);
        this.name = "AbortError";
    }
}
