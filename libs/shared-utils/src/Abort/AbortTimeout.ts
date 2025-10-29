// This is a stub for AbortSignal.timeout which is not available in Safari 15.
// Example usage: const signal = abortTimeout(5000, 'Operation timed out');

import { TimeoutError } from "./TimeoutError";

export function abortTimeout(milliseconds: number, reason?: Error): AbortSignal {
    const controller = new AbortController();
    setTimeout(() => {
        controller.abort(reason ?? new TimeoutError("Operation timed out"));
    }, milliseconds);
    return controller.signal;
}
