import { describe, expect, it } from "vitest";
import type { AreaData } from "../src/types";
import { getWhiteboardRights } from "../src/Whiteboard/WhiteboardRights";

const area = (rights?: { readTags: string[]; writeTags: string[] }): AreaData => ({
    id: "area",
    name: "Atelier",
    x: 0,
    y: 0,
    width: 10,
    height: 10,
    visible: true,
    properties: [
        { id: "board", type: "whiteboard" },
        ...(rights ? [{ id: "rights", type: "restrictedRightsPropertyData" as const, ...rights }] : []),
    ],
});

describe("getWhiteboardRights", () => {
    it("lets everybody draw on an area without rights", () => {
        expect(getWhiteboardRights(area(), [])).toEqual({ canRead: true, canWrite: true });
        expect(getWhiteboardRights(area({ readTags: [], writeTags: [] }), [])).toEqual({
            canRead: true,
            canWrite: true,
        });
    });

    it("lets the write tags draw and the read tags only look", () => {
        const rights = { readTags: ["member"], writeTags: ["admin"] };
        expect(getWhiteboardRights(area(rights), ["admin"])).toEqual({ canRead: true, canWrite: true });
        expect(getWhiteboardRights(area(rights), ["member"])).toEqual({ canRead: true, canWrite: false });
        expect(getWhiteboardRights(area(rights), [])).toEqual({ canRead: false, canWrite: false });
    });

    it("lets everybody who is let in draw when the area only restricts who comes in", () => {
        expect(getWhiteboardRights(area({ readTags: ["member"], writeTags: [] }), ["member"])).toEqual({
            canRead: true,
            canWrite: true,
        });
    });
});
