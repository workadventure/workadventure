import { describe, expect, it, vi } from "vitest";
import { get } from "svelte/store";
import type { Writable } from "svelte/store";

const stores: Record<string, Writable<unknown>> = vi.hoisted(() => ({}));

vi.mock("./PeerStore", async () => {
    const { writable } = await import("svelte/store");
    stores.videos = writable([]);
    stores.pip = writable(false);
    return { videoStreamElementsStore: stores.videos, activePictureInPictureStore: stores.pip };
});
vi.mock("./IsStreamingStore", async () => {
    const { writable } = await import("svelte/store");
    stores.streaming = writable(false);
    return { isLiveStreamingStore: stores.streaming };
});
vi.mock("./FocusStore", async () => {
    const { writable } = await import("svelte/store");
    stores.focus = writable(true);
    return { focusStore: stores.focus };
});
vi.mock("./CurrentPlayerGroupStore", async () => {
    const { writable } = await import("svelte/store");
    stores.group = writable(undefined);
    return { currentPlayerGroupIdStore: stores.group };
});

import { privacyShutdownStore } from "./PrivacyShutdownStore";

describe("privacyShutdownStore", () => {
    it("stays on when someone walks up to a user who left the page", () => {
        stores.focus.set(false);
        expect(get(privacyShutdownStore)).toBe(true);

        stores.group.set(42);
        stores.videos.set([{}]);
        expect(get(privacyShutdownStore)).toBe(true);

        stores.focus.set(true);
        expect(get(privacyShutdownStore)).toBe(false);
    });

    it("stays off when the user leaves while still in a bubble", () => {
        stores.group.set(42);
        stores.focus.set(true);
        stores.focus.set(false);
        expect(get(privacyShutdownStore)).toBe(false);

        stores.group.set(undefined);
        stores.videos.set([]);
        expect(get(privacyShutdownStore)).toBe(true);
    });
});
