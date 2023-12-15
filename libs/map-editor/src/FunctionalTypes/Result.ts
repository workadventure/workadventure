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
