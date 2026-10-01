import { get, writable } from "svelte/store";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { SpaceInterface } from "../SpaceInterface";

// watchRaiseHandState only touches stores; mock the Phaser- and UI-heavy modules BindMuteEvents pulls in.
vi.mock("../../Stores/NotificationStore", () => ({ notificationPlayingStore: { playNotification: vi.fn() } }));
vi.mock("../../Stores/MediaStore", async () => {
    const { writable: w } = await import("svelte/store");
    return { isSpeakerStore: w(false), requestedCameraState: w(false), requestedMicrophoneState: w(false) };
});
vi.mock("../../Stores/MegaphoneStore", async () => {
    const { writable: w } = await import("svelte/store");
    return { currentLiveStreamingSpaceStore: w(undefined), givenFloorSpaceStore: w(undefined) };
});
vi.mock("../../../i18n/i18n-svelte", async () => {
    const { readable } = await import("svelte/store");
    const LL = readable(new Proxy({}, { get: () => new Proxy(() => "", { get: () => () => "" }) }));
    return { default: LL, LL };
});
vi.mock("../../Components/ActionBar/MenuIcons/megaphoneActions", () => ({ stopMegaphoneLive: vi.fn() }));
vi.mock("../../Stores/ChatStore", () => ({ chatZoneLiveStore: { set: vi.fn() } }));
vi.mock("../../Phaser/Game/GameManager", () => ({ gameManager: {} }));
vi.mock("../../Stores/PopupStore", () => ({ popupStore: { addPopup: vi.fn(), removePopup: vi.fn() } }));
vi.mock("../../Components/PopUp/MuteDialogPopup.svelte", () => ({ default: {} }));

import { requestedHandRaiseState } from "../../Stores/RaiseHandStore";
import { watchRaiseHandState } from "./BindMuteEvents";

const ME = "me";

function fakeSpace(name: string) {
    const store = writable({
        raisedHands: [] as { spaceUserId: string }[],
        floorHolders: [] as { spaceUserId: string }[],
    });
    const space = {
        mySpaceUserId: ME,
        getName: () => name,
        state: { store },
        startStreaming: vi.fn(),
        stopStreaming: vi.fn(),
    } as unknown as SpaceInterface;
    return { space, store };
}

describe("watchRaiseHandState", () => {
    afterEach(() => {
        requestedHandRaiseState.lowerAll();
    });

    it("only lowers the hand of the space where a moderator lowered it", () => {
        const bubble = fakeSpace("bubble");
        const zone = fakeSpace("zone");
        const unsubscribers = [watchRaiseHandState(bubble.space), watchRaiseHandState(zone.space)];

        requestedHandRaiseState.raise("bubble");
        requestedHandRaiseState.raise("zone");
        zone.store.set({ raisedHands: [{ spaceUserId: ME }], floorHolders: [] });
        bubble.store.set({ raisedHands: [{ spaceUserId: ME }], floorHolders: [] });

        // The zone's host lowers the hand.
        zone.store.set({ raisedHands: [], floorHolders: [] });

        expect([...get(requestedHandRaiseState)]).toEqual(["bubble"]);
        unsubscribers.forEach((unsubscribe) => unsubscribe());
    });

    it("only lowers the hand of the space where the floor was given", () => {
        const bubble = fakeSpace("bubble");
        const zone = fakeSpace("zone");
        const unsubscribers = [watchRaiseHandState(bubble.space), watchRaiseHandState(zone.space)];

        requestedHandRaiseState.raise("bubble");
        requestedHandRaiseState.raise("zone");
        zone.store.set({ raisedHands: [{ spaceUserId: ME }], floorHolders: [] });

        zone.store.set({ raisedHands: [], floorHolders: [{ spaceUserId: ME }] });

        expect([...get(requestedHandRaiseState)]).toEqual(["bubble"]);
        unsubscribers.forEach((unsubscribe) => unsubscribe());
    });
});
