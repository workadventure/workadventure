import { beforeEach, describe, expect, it, vi } from "vitest";
import { get } from "svelte/store";

vi.mock("../Administration/AnalyticsClient", () => ({ analyticsClient: { trackAdminEvent: vi.fn() } }));

// The favourites are read from localStorage when the module loads, so each test loads it afresh.
async function loadStore() {
    vi.resetModules();
    return import("./WokaEmoteStore");
}

describe("wokaEmoteFavoritesStore", () => {
    beforeEach(() => localStorage.clear());

    it("starts with five favourites and saves every change", async () => {
        const { wokaEmoteFavoritesStore } = await loadStore();
        expect(get(wokaEmoteFavoritesStore)).toHaveLength(5);

        wokaEmoteFavoritesStore.toggle("laugh");
        expect(get(wokaEmoteFavoritesStore)).not.toContain("laugh");
        expect(JSON.parse(localStorage.getItem("wokaEmoteFavorites") ?? "[]")).not.toContain("laugh");

        const reloaded = await loadStore();
        expect(get(reloaded.wokaEmoteFavoritesStore)).toEqual(get(wokaEmoteFavoritesStore));
    });

    it("refuses a sixth favourite", async () => {
        const { wokaEmoteFavoritesStore } = await loadStore();
        const before = get(wokaEmoteFavoritesStore);
        wokaEmoteFavoritesStore.toggle(before.includes("afk") ? "nod" : "afk");
        expect(get(wokaEmoteFavoritesStore)).toEqual(before);
    });

    it("drops emotes it does not know and survives a corrupted entry", async () => {
        localStorage.setItem("wokaEmoteFavorites", JSON.stringify(["spin", "teleport", "nod"]));
        expect(get((await loadStore()).wokaEmoteFavoritesStore)).toEqual(["spin", "nod"]);

        localStorage.setItem("wokaEmoteFavorites", "{not json");
        expect(get((await loadStore()).wokaEmoteFavoritesStore)).toHaveLength(5);
    });
});

describe("playWokaEmote", () => {
    it("stops the preview before the real emote is requested", async () => {
        const { playWokaEmote, wokaEmotePreviewStore, wokaEmoteStore } = await loadStore();
        const order: string[] = [];
        wokaEmotePreviewStore.set("dance");
        const unsubscribePreview = wokaEmotePreviewStore.subscribe((id) => order.push(`preview:${id}`));
        const unsubscribeEmote = wokaEmoteStore.subscribe((id) => order.push(`emote:${id}`));
        order.length = 0;

        playWokaEmote("jump");

        expect(order).toEqual(["preview:null", "emote:jump"]);
        unsubscribePreview();
        unsubscribeEmote();
    });
});
