import { describe, expect, it } from "vitest";
import { getWorldPathPrefix } from "../../src/pusher/services/WorldPathPrefix";

describe("getWorldPathPrefix", () => {
    it("keeps the organization and the world of a room", () => {
        expect(getWorldPathPrefix("https://play.test/@/org/world/room")).toBe("/@/org/world/");
        expect(getWorldPathPrefix("https://play.test/@/org/world/floor/2")).toBe("/@/org/world/");
    });

    it("does not let a world match another world whose name starts the same", () => {
        expect("/@/org/world-2/room".startsWith(getWorldPathPrefix("https://play.test/@/org/world/room") ?? "")).toBe(
            false,
        );
    });

    it("has no world for a public map", () => {
        expect(getWorldPathPrefix("https://play.test/_/global/maps.test/map.json")).toBeUndefined();
        expect(getWorldPathPrefix("https://play.test/@/org")).toBeUndefined();
    });
});
