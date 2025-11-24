import { TimeoutError } from "rxjs";

/**
 * Returns a promise that rejects after the given number of milliseconds.
 */
export function setTimeoutPromise(ms: number): Promise<void> {
    return new Promise((resolve, reject) => {
        setTimeout(() => reject(new TimeoutError()), ms);
    });
}

/**
 * Returns a promise that resolves when the promise passed in parameter resolves or rejects when the given number of milliseconds has passed.
 */
export function raceTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    return Promise.race([promise, setTimeoutPromise(ms)]);
}
