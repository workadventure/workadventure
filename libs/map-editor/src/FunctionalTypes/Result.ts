import { asError } from "catch-unknown";

export type Success<T> = { ok: true; value: T };
export type Failure<E> = { ok: false; error: E };
export type Result<T, E> = Success<T> | Failure<E>;

export function success<T>(value: T) {
    return {
        ok: true,
        value,
    } as Success<T>;
}

export function failure<E>(error: E) {
    return {
        ok: false,
        error,
    } as Failure<E>;
}

export function isSuccess<T, E>(result: Result<T, E>): result is Success<T> {
    return result.ok;
}

export function isFailure<T, E>(result: Result<T, E>): result is Failure<E> {
    return !result.ok;
}

/**
 * Returns the result or throw an error if the result is a failure.
 */
export function resultOrThrow<T, E>(result: Result<T, E>): T {
    if (result.ok) {
        return result.value;
    } else {
        throw asError(result.error);
    }
}
