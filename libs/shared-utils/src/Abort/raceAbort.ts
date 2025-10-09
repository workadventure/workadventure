import { asError } from "catch-unknown";
import { AbortError } from "./AbortError";

/**
 * Wraps a promise in a function that can be aborted using an AbortSignal.
 *
 * This function returns a new promise that resolves or rejects with the same value as the input promise,
 * unless the provided AbortSignal is triggered, in which case it rejects with an "aborted" error.
 */
export function raceAbort<T>(promise: Promise<T>, signal: AbortSignal | undefined | null): Promise<T> {
    if (!signal) {
        return promise;
    }

    if (signal.aborted) {
        return Promise.reject(new AbortError());
    }

    const abortPromise = new Promise<void>((_, reject) => {
        const onAbort = (event: Event) => {
            reject(eventToAbortReason(event));
        };
        signal.addEventListener("abort", onAbort, { once: true });
        promise = promise.finally(() => signal.removeEventListener("abort", onAbort));
    });

    return Promise.race([promise, abortPromise]) as Promise<T>;
}

export function eventToAbortReason(event: Event): Error {
    const target = event.target as AbortSignal;
    if (target.reason) {
        return asError(target.reason);
    } else {
        return new AbortError();
    }
}
