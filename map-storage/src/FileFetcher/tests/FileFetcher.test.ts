import { describe, expect, it, vi } from "vitest";

// The real module validates the whole environment on import, which CI does not provide.
vi.mock("../../Enum/EnvironmentVariable", () => ({ CACHE_CONTROL: "no-cache", USE_DOMAIN_NAME_IN_PATH: false }));

const { isPrivatePath } = await import("../FileFetcher");

describe("isPrivatePath", () => {
    it("sees private/ however the decoded path spells it", () => {
        for (const spelling of [
            "/private/whiteboards/maps/office/area/board.excalidraw",
            "//private/whiteboards/x.png",
            "/PRIVATE/files/x.png",
            "/./private/files/x.png",
            "/maps/../private/files/x.png",
        ]) {
            expect(isPrivatePath(spelling), spelling).toBe(true);
        }
    });

    it("leaves the public files alone", () => {
        expect(isPrivatePath("/maps/office.wam")).toBe(false);
        expect(isPrivatePath("/maps/private/office.wam")).toBe(false);
        expect(isPrivatePath("/private-maps/office.wam")).toBe(false);
    });
});
