// This is a stub for AbortSignal.any which is not available until Safari 17.4.
// Example usage: const signal = abortAny([signal1, signal2]);

export function abortAny(signals: AbortSignal[]): AbortSignal {
    const controller = new AbortController();
    const onAbort = () => {
        controller.abort();
        for (const signal of signals) {
            signal.removeEventListener("abort", onAbort);
        }
    };
    for (const signal of signals) {
        if (signal.aborted) {
            onAbort();
            break;
        }
        signal.addEventListener("abort", onAbort);
    }
    return controller.signal;
}
