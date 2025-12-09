import { AbortError } from "./AbortError";

export class TimeoutError extends AbortError {
    constructor(message?: string, options?: { cause?: Error }) {
        super(message ?? "Operation timed out", options);
        this.name = "TimeoutError";
    }
}
