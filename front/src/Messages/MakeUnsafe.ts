import type {UnsafeString} from "./UnsafeString";

type ReplaceReturnType<T extends (...args: unknown[]) => unknown> = (...a: Parameters<T>) => MakeUnsafe<ReturnType<T>>;

type Primitives = undefined | null | boolean | number

export type MakeUnsafe<T> = T extends Primitives ? T : T extends String
    ? UnsafeString
    : (T extends Array<infer SubType>
        ? Array<MakeUnsafe<SubType>>
        : (T extends (...args: unknown[]) => unknown
            ? ReplaceReturnType<T>
            : {
                [P in keyof T]: MakeUnsafe<T[P]>
            }))
