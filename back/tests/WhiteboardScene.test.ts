import { describe, expect, it } from "vitest";
import { parseWhiteboardElements, WhiteboardScene } from "../src/Model/Whiteboard/WhiteboardScene";

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
