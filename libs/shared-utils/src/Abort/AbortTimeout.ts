// This is a stub for AbortSignal.timeout which is not available in Safari 15.
// Example usage: const signal = abortTimeout(5000, 'Operation timed out');

import { AbortError } from "./AbortError";

export function abortTimeout(milliseconds: number, reason?: Error): AbortSignal {
    const controller = new AbortController();
    setTimeout(() => {
        controller.abort(reason ?? new AbortError("Operation timed out"));
    }, milliseconds);
    return controller.signal;
}
