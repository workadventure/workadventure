import { describe, expect, it, vi } from "vitest";

vi.mock("../../../src/front/Phaser/Game/GameManager", () => ({
    gameManager: {
        getCurrentGameScene: () => ({ room: { mapStorageUrl: new URL("https://map-storage.example.com/") } }),
    },
}));

import { resolveSoundUrl } from "../../../src/front/Utils/UrlPlaceholderResolver";

const MAP_URL = "https://maps.example.com/office/map.wam";

describe("resolveSoundUrl", () => {
    it.each([
        { raw: "{play_url}/resources/gong.mp3", expected: `${window.location.origin}/resources/gong.mp3` },
        {
            raw: "{map_storage_url}/assets/sounds/gong.mp3",
            expected: "https://map-storage.example.com/assets/sounds/gong.mp3",
        },
        { raw: "sounds/gong.mp3", expected: "https://maps.example.com/office/sounds/gong.mp3" },
        { raw: "https://cdn.example.com/gong.mp3", expected: "https://cdn.example.com/gong.mp3" },
    ])("resolves $raw", ({ raw, expected }) => {
        expect(resolveSoundUrl(raw, MAP_URL)).toBe(expected);
    });
});
