import { z } from "zod";

export const BoolAsString = z.union([
    z.literal("true"),
    z.literal("false"),
    z.literal("0"),
    z.literal("1"),
    z.literal(""),
]);
export type BoolAsString = z.infer<typeof BoolAsString>;

export const PositiveIntAsString = z.string().regex(/^\d*$/, { message: "Must be a positive integer number" });
export type PositiveIntAsString = z.infer<typeof PositiveIntAsString>;

export const AbsoluteOrRelativeUrl = z.string().url().or(z.string().startsWith("/")).or(z.literal(""));

export function toNumber(value: string | undefined, defaultValue: number): number {
    if (value === undefined || value === "") {
        return defaultValue;
    }
    return Number(value);
}

export function toArray(value: string | undefined): Array<string> {
    if (value === undefined || value === "") {
        return [];
    }
    return value.split(",");
}

export function toBool(value: BoolAsString | undefined, defaultValue: boolean): boolean {
    if (value === undefined || value === "") {
        return defaultValue;
    }
    return value === "true" || value === "1";
}

export function emptyStringToUndefined(value: string | undefined): string | undefined {
    if (value === "") {
        return undefined;
    }
    return value;
}

export function emptyStringToDefault(defaultValue: string): (value: string | undefined) => string {
    return (value: string | undefined) => {
        if (value === "" || value === undefined) {
            return defaultValue;
        }
        return value;
    };
}
