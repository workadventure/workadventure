import { describe, expect, it } from "vitest";
import { isMessageLongerThanCollapsedHeight } from "./MessageTextLayout";

describe("MessageTextLayout", () => {
    it("keeps messages below the collapsed height expanded", () => {
        expect(isMessageLongerThanCollapsedHeight(160, 20)).toBe(false);
    });

    it("marks messages above eight rendered lines as long", () => {
        expect(isMessageLongerThanCollapsedHeight(181, 20)).toBe(true);
    });

    it("uses a fallback line height when the browser returns a non numeric value", () => {
        expect(isMessageLongerThanCollapsedHeight(181, Number.NaN)).toBe(true);
    });
});
