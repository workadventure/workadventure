import { describe, expect, it } from "vitest";
import { arrayIntersect } from "../src/Services/ArrayHelper";

describe("RoomIdentifier", () => {
    it("should return true on intersect", () => {
        expect(arrayIntersect(["admin", "user"], ["admin", "superAdmin"])).toBe(true);
    });
    it("should be reflexive", () => {
        expect(arrayIntersect(["admin", "superAdmin"], ["admin", "user"])).toBe(true);
    });
    it("should return false on non intersect", () => {
        expect(arrayIntersect(["admin", "user"], ["superAdmin"])).toBe(false);
    });
});
