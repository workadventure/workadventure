import { describe, expect, it } from "vitest";
import { defaultBackgroundImages, getAvailableBackgroundImages } from "./BackgroundPresets";

const custom = { id: "42", name: "HQ", url: "https://cdn.test/hq.jpg", thumbnailUrl: "https://cdn.test/hq-thumb.jpg" };

describe("getAvailableBackgroundImages", () => {
    it("offers every built-in image when the world has no customization", () => {
        expect(getAvailableBackgroundImages(undefined)).toEqual(defaultBackgroundImages);
    });

    it("hides the built-in images listed by id", () => {
        const ids = getAvailableBackgroundImages({ hiddenDefaults: ["office", "ronchi"], custom: [] }).map((i) => i.id);
        expect(ids).toHaveLength(defaultBackgroundImages.length - 2);
        expect(ids).not.toContain("office");
        expect(ids).not.toContain("ronchi");
    });

    it("hides every built-in image with *", () => {
        expect(getAvailableBackgroundImages({ hiddenDefaults: ["*"], custom: [] })).toEqual([]);
    });

    it("lists custom images first", () => {
        const images = getAvailableBackgroundImages({ hiddenDefaults: [], custom: [custom] });
        expect(images[0]).toEqual({ id: "42", name: "HQ", url: custom.url, thumbnail: custom.thumbnailUrl });
        expect(images).toHaveLength(defaultBackgroundImages.length + 1);
    });

    it("keeps built-in ids unique", () => {
        expect(new Set(defaultBackgroundImages.map((i) => i.id)).size).toBe(defaultBackgroundImages.length);
    });
});
