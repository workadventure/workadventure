const loggedKeys = new Set<string>();

/**
 * Runs `log` only the first time it is called for a given `key`. Used by the
 * background processor to emit a diagnostic (selected backend, fallback taken,
 * ...) once rather than on every frame.
 */
export function logOnce(key: string, log: () => void): void {
    if (loggedKeys.has(key)) {
        return;
    }

    loggedKeys.add(key);
    log();
}

/** Clears the once-logging state. Test-only. */
export function resetLogOnceForTests(): void {
    loggedKeys.clear();
}
