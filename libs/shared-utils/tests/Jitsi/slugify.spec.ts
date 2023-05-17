import { describe, expect, it } from "@jest/globals";
import { Json } from "@workadventure/tiled-map-type-guard";
import { GameMapProperties } from "@workadventure/map-editor";
import { slugifyJitsiRoomName } from "../../src/Jitsi/slugify";

describe("Shared utils", () => {
    it("should slugify Jitsi room", () => {
        const properties = new Map<string, string | number | boolean | Json>();
        const jitsiRoom = slugifyJitsiRoomName(
            "Foo",
            "https://play.workadventure.localhost/_/foo/bar.com/map.tmj",
            properties.has(GameMapProperties.JITSI_NO_PREFIX)
        );

        expect(jitsiRoom).toBe("y6v7zb-foo");

        properties.set("jitsiNoPrefix", true);
        const jitsiRoom2 = slugifyJitsiRoomName(
            "Foo",
            "https://play.workadventure.localhost/_/foo/bar.com/map.tmj",
            properties.has(GameMapProperties.JITSI_NO_PREFIX)
        );

        expect(jitsiRoom2).toBe("foo");
    });
});
