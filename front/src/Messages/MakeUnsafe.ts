/* eslint-disable @typescript-eslint/no-explicit-any */

import type {UnsafeString} from "./UnsafeString";

type ReplaceReturnType<T extends (...a: any) => string> = (...a: Parameters<T>) => UnsafeString;

/**
 * Builds a new type where every function that returns a "string" will return a "UnsafeString" instead.
 * This is useful to force developers into checking that a string was indeed sanitized before using it.
 */
export type MakeUnsafe<T> = {
    [P in keyof T]: T[P] extends (...a: any) => string
        ? ReplaceReturnType<T[P]>
        : T[P] extends (...a: any) => any
            ? (...a: Parameters<T[P]>) => ReturnType<T[P]>
            : T[P] extends object
                ? MakeUnsafe<T[P]>
                : T[P];
}
