import { describe, expect, it } from "vitest";
import {
    MAX_BOARD_BYTES,
    MAX_ELEMENT_BYTES,
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

    it("rejects an image whose file id is a URL or a path", () => {
        const image = (fileId: string) => JSON.stringify([rect(1, 1, { type: "image", fileId })]);
        expect(parseWhiteboardElements(image("0123456789abcdef0123456789abcdef01234567"))).toHaveLength(1);
        expect(() => parseWhiteboardElements(image("https://example.com/x"))).toThrow();
        expect(() => parseWhiteboardElements(image("../../maps/office"))).toThrow();
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
        expect(scene.merge([{ ...rect(1, 1), id: "one-too-many" }])).toMatchObject({ accepted: [], full: true });
        expect(scene.merge([{ ...rect(2, 1), id: "e0" }])).toMatchObject({ full: false });
    });

    it("refuses what would make an element or the board too big, and brings the sender back in line", () => {
        const padding = (bytes: number) => ({ text: "x".repeat(bytes) });
        const scene = new WhiteboardScene([rect(1, 1)]);
        const huge = scene.merge([rect(2, 1, padding(MAX_ELEMENT_BYTES))]);
        expect(huge.accepted).toHaveLength(0);
        expect(huge.outdated).toEqual([rect(1, 1)]);
        expect(huge.full).toBe(true);

        const chunk = MAX_ELEMENT_BYTES - 1000;
        const count = Math.ceil(MAX_BOARD_BYTES / chunk);
        const big = Array.from({ length: count }, (_, i) => ({ ...rect(1, 1, padding(chunk)), id: `big${i}` }));
        const merged = scene.merge(big);
        expect(merged.accepted.length).toBeLessThan(count);
        expect(merged.full).toBe(true);
        // Deleting an element frees its room once it is pruned.
        scene.merge([{ ...rect(1, 1, padding(chunk)), id: "big0", version: 2, isDeleted: true, updated: 0 }]);
        scene.pruneDeletedBefore(1);
        expect(scene.merge([{ ...rect(1, 1, padding(chunk)), id: "late" }]).accepted).toHaveLength(1);
    });
});
