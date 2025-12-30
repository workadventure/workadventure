import { AbortError } from "@workadventure/shared-utils/src/Abort/AbortError";

/**
 * Abort error initiated by the client.
 */
export class ClientAbortError extends AbortError {
    constructor(message?: string, options?: { cause?: Error }) {
        super(message ?? "Client abort message received", options);
        this.name = "ClientAbortError";
    }
}
