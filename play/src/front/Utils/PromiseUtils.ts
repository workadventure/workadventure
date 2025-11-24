import { TimeoutError } from "rxjs";

/**
 * Returns a promise that rejects after the given number of milliseconds.
 */
export function setTimeoutPromise(ms: number): Promise<never> {
    return new Promise((_, reject) => {
        setTimeout(() => reject(new TimeoutError()), ms);
    });
}

/**
 * Returns a promise that resolves when the promise passed in parameter resolves or rejects when the given number of milliseconds has passed.
 */
export function raceTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
    return Promise.race([promise, setTimeoutPromise(ms)]);
}
