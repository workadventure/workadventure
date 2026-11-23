import { expect, test } from "vitest";
import { coerceStatus } from "./presence";

test("takes the page's status as is", () => {
    expect(coerceStatus({ label: "Silent zone", color: 0xe74c3c })).toEqual({ label: "Silent zone", color: 0xe74c3c });
});

test("refuses a status that is not a label and a 0xRRGGBB color", () => {
    expect(coerceStatus(undefined)).toBeUndefined();
    expect(coerceStatus("online")).toBeUndefined();
    expect(coerceStatus({ label: "Online" })).toBeUndefined();
    expect(coerceStatus({ label: "Online", color: "#68e97a" })).toBeUndefined();
    expect(coerceStatus({ label: "Online", color: 1.5 })).toBeUndefined();
    expect(coerceStatus({ label: "Online", color: 0x1000000 })).toBeUndefined();
    expect(coerceStatus({ label: "Online", color: -1 })).toBeUndefined();
});

test("cuts a long label to fit a menu", () => {
    expect(coerceStatus({ label: "x".repeat(500), color: 0 })?.label).toHaveLength(100);
});
