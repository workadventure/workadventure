import { describe, expect, it } from "vitest";
import { canCreateProximityContent } from "../ProximityCreationPermissions";

describe("ProximityCreationPermissions", () => {
    it("should allow proximity content creation when chat is enabled even if the user is filtered out", () => {
        expect(canCreateProximityContent(false)).toBe(true);
    });

    it("should prevent proximity content creation when chat is disabled", () => {
        expect(canCreateProximityContent(true)).toBe(false);
    });
});
