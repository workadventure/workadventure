/**
 * Returns a promise that resolves after the given number of milliseconds.
 */
export function setTimeoutPromise(ms: number): Promise<void> {
    return new Promise((resolve) => {
        setTimeout(() => resolve(), ms);
    });
}

/**
 * Returns a promise that resolves when the promise passed in parameter resolves or when the given number of milliseconds has passed.
 */
export function raceTimeout<T>(promise: Promise<T>, ms: number): Promise<T | void> {
    return Promise.race([promise, setTimeoutPromise(ms)]);
}
