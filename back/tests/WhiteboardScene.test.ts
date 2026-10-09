import { describe, expect, it } from "vitest";
import {
    MAX_ELEMENTS_PER_BOARD,
    parseWhiteboardElements,
    WhiteboardScene,
} from "../src/Model/Whiteboard/WhiteboardScene";

const rect = (version: number, versionNonce: number, extra: Record<string, unknown> = {}) => ({
    id: "rect",
    type: "rectangle",
    index: "a0",
    version,
    versionNonce,
    ...extra,
});

describe("WhiteboardScene", () => {
    it("keeps the higher version", () => {
        const scene = new WhiteboardScene([rect(2, 10)]);
        expect(scene.merge([rect(3, 50)]).accepted).toHaveLength(1);
        const { accepted, outdated } = scene.merge([rect(1, 1)]);
        expect(accepted).toHaveLength(0);
        expect(outdated).toEqual([rect(3, 50)]);
        expect(scene.getElements()).toEqual([rect(3, 50)]);
    });

    it("breaks a version tie with the lower nonce, like Excalidraw", () => {
        const scene = new WhiteboardScene([rect(2, 10)]);
        expect(scene.merge([rect(2, 20)]).accepted).toHaveLength(0);
        expect(scene.merge([rect(2, 5)]).accepted).toHaveLength(1);
        expect(scene.getElements()[0].versionNonce).toBe(5);
    });

    it("keeps unknown fields verbatim, the fractional index included", () => {
        const scene = new WhiteboardScene();
        scene.merge(parseWhiteboardElements(JSON.stringify([rect(1, 1, { index: "a1V", strokeColor: "#1e1e1e" })])));
        expect(scene.getElements()[0]).toMatchObject({ index: "a1V", strokeColor: "#1e1e1e" });
    });

    it("rejects payloads that are not elements", () => {
        expect(() => parseWhiteboardElements("{}")).toThrow();
        expect(() => parseWhiteboardElements(JSON.stringify([{ id: "x" }]))).toThrow();
    });
});

describe("WhiteboardScene limits and clear", () => {
    it("deletes every element with a newer version", () => {
        const scene = new WhiteboardScene([rect(4, 7), { ...rect(1, 1), id: "other" }]);
        const deleted = scene.clear();
        expect(deleted).toHaveLength(2);
        expect(deleted.every((element) => element.isDeleted === true)).toBe(true);
        expect(deleted.find((element) => element.id === "rect")?.version).toBe(5);
        expect(scene.clear()).toHaveLength(0);
    });

    it("refuses new elements beyond the cap but keeps updating the existing ones", () => {
        const scene = new WhiteboardScene(
            Array.from({ length: MAX_ELEMENTS_PER_BOARD }, (_, i) => ({ ...rect(1, 1), id: `e${i}` })),
        );
        expect(scene.merge([{ ...rect(1, 1), id: "one-too-many" }]).accepted).toHaveLength(0);
        expect(scene.merge([{ ...rect(2, 1), id: "e0" }]).accepted).toHaveLength(1);
    });
});
