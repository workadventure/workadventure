import { describe, expect, it } from "vitest";
import { canUserEditCustomEntity } from "../canUserEditCustomEntity";

const OWNER_UUID = "998ce839-3dea-4698-8b41-ebbdf7688ad9";
const OTHER_UUID = "11111111-2222-3333-4444-555555555555";

describe("canUserEditCustomEntity", () => {
    describe("user with map edit rights", () => {
        it("can edit an entity owned by somebody else", () => {
            expect(canUserEditCustomEntity({ ownerId: OWNER_UUID }, OTHER_UUID, true)).toBe(true);
        });

        it("can edit a legacy entity with no owner", () => {
            expect(canUserEditCustomEntity({ ownerId: undefined }, OTHER_UUID, true)).toBe(true);
        });

        it("is allowed even when the entity cannot be found", () => {
            expect(canUserEditCustomEntity(undefined, OTHER_UUID, true)).toBe(true);
        });
    });

    describe("user without map edit rights", () => {
        it("can edit their own entity", () => {
            expect(canUserEditCustomEntity({ ownerId: OWNER_UUID }, OWNER_UUID, false)).toBe(true);
        });

        it("cannot edit an entity owned by somebody else", () => {
            expect(canUserEditCustomEntity({ ownerId: OWNER_UUID }, OTHER_UUID, false)).toBe(false);
        });

        it("cannot edit a legacy entity with no owner", () => {
            expect(canUserEditCustomEntity({ ownerId: undefined }, OWNER_UUID, false)).toBe(false);
        });

        it("cannot edit an entity that cannot be found", () => {
            expect(canUserEditCustomEntity(undefined, OWNER_UUID, false)).toBe(false);
        });

        it("cannot edit anything when their own uuid is missing", () => {
            expect(canUserEditCustomEntity({ ownerId: OWNER_UUID }, undefined, false)).toBe(false);
        });

        it("does not match an empty ownerId with an empty uuid", () => {
            expect(canUserEditCustomEntity({ ownerId: "" }, "", false)).toBe(false);
        });
    });
});
