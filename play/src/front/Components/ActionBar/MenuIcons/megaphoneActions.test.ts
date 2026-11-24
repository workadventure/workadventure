import { get } from "svelte/store";
import { describe, expect, it, vi } from "vitest";
import type { SpaceInterface } from "../../../Space/SpaceInterface";

vi.mock("@sentry/svelte", () => ({ captureException: vi.fn() }));
vi.mock("../../../Administration/AnalyticsClient", () => ({
    analyticsClient: { startMegaphone: vi.fn(), stopMegaphone: vi.fn() },
}));
vi.mock("../../../Stores/MediaStore", async () => {
    const { writable } = await import("svelte/store");
    return { streamingMegaphoneStore: writable(false) };
});
vi.mock("../../../Stores/MegaphoneStore", async () => {
    const { writable } = await import("svelte/store");
    return {
        currentLiveStreamingSpaceStore: writable(undefined),
        megaphoneSpaceStore: writable(undefined),
        requestedMegaphoneStore: writable(false),
    };
});

import { megaphoneSpaceStore, requestedMegaphoneStore } from "../../../Stores/MegaphoneStore";
import { startMegaphoneLive } from "./megaphoneActions";

describe("startMegaphoneLive", () => {
    it("does not go live when the megaphone space was not joined", () => {
        megaphoneSpaceStore.set(undefined);
        startMegaphoneLive();
        expect(get(requestedMegaphoneStore)).toBe(false);
    });

    it("streams on the megaphone space once joined", () => {
        const startStreaming = vi.fn();
        megaphoneSpaceStore.set({ startStreaming } as unknown as SpaceInterface);
        startMegaphoneLive();
        expect(get(requestedMegaphoneStore)).toBe(true);
        expect(startStreaming).toHaveBeenCalledOnce();
    });
});
