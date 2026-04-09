import { asError } from "catch-unknown";

import { TimeoutError } from "@workadventure/shared-utils/src/Abort/TimeoutError";

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

/**
 * Same as raceTimeout, but clears the timeout when the wrapped promise settles first.
 */
export function raceTimeoutAndCancelTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
    return new Promise<T>((resolve, reject) => {
        const timeoutId = setTimeout(() => {
            reject(new TimeoutError());
        }, ms);

        promise.then(
            (value) => {
                clearTimeout(timeoutId);
                resolve(value);
            },
            (error) => {
                clearTimeout(timeoutId);
                reject(asError(error));
            }
        );
    });
}
