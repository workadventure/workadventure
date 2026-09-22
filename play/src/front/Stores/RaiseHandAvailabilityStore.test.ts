import { type Writable, get } from "svelte/store";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Mock every store raiseHandAvailableStore derives from (except the zone-settings ones, which are already
// plain writables) so the module loads without pulling the real Phaser-heavy stores.
vi.mock("./MediaStore", async () => {
    const { writable: w } = await import("svelte/store");
    return { isSpeakerStore: w(false), silentStore: w(false), inLivekitStore: w(false) };
});
vi.mock("./MegaphoneStore", async () => {
    const { writable: w } = await import("svelte/store");
    return { givenFloorSpaceStore: w<unknown>(undefined) };
});
vi.mock("./StreamableCollectionStore", async () => {
    const { writable: w } = await import("svelte/store");
    return { isInRemoteConversation: w(false) };
});

import { inLivekitStore, isSpeakerStore, silentStore } from "./MediaStore";
import { givenFloorSpaceStore } from "./MegaphoneStore";
import { isInRemoteConversation } from "./StreamableCollectionStore";
import { currentPlayerGroupIdStore } from "./CurrentPlayerGroupStore";
import { inMegaphoneZoneStore, meetingRaiseHandStore, megaphoneRaiseHandStore } from "./RaiseHandZoneSettingsStore";
import { raiseHandAvailableStore } from "./RaiseHandAvailabilityStore";

const speaker = isSpeakerStore;
const inLivekit = inLivekitStore;
// The real silentStore is a custom store with no set(); the mock above replaces it with a plain writable.
const silent = silentStore as unknown as Writable<boolean>;
const grantedFloor = givenFloorSpaceStore as unknown as Writable<unknown>;
const inConversation = isInRemoteConversation as unknown as Writable<boolean>;

/** The local user talks to nearby players: peers, a server-side group, no zone. */
function enterProximityBubble() {
    inConversation.set(true);
    currentPlayerGroupIdStore.set(42);
}

/** The local user receives the room-level megaphone: a remote stream, but no zone and no group. */
function receiveGlobalMegaphone() {
    inConversation.set(true);
    currentPlayerGroupIdStore.set(undefined);
}

describe("raiseHandAvailableStore", () => {
    const reset = () => {
        speaker.set(false);
        silent.set(false);
        inLivekit.set(false);
        grantedFloor.set(undefined);
        inConversation.set(false);
        currentPlayerGroupIdStore.set(undefined);
        meetingRaiseHandStore.set(false);
        megaphoneRaiseHandStore.set(false);
        inMegaphoneZoneStore.set(false);
    };

    beforeEach(reset);
    afterEach(reset);

    it("is hidden when alone, outside any conversation", () => {
        expect(get(raiseHandAvailableStore)).toBe(false);
    });

    it("shows in a proximity bubble, where the queue lets whoever leads give the floor orally", () => {
        enterProximityBubble();
        expect(get(raiseHandAvailableStore)).toBe(true);
    });

    it("shows in a meeting room that allows raising hands", () => {
        inLivekit.set(true);
        meetingRaiseHandStore.set(true);
        expect(get(raiseHandAvailableStore)).toBe(true);
    });

    it("stays hidden in a meeting room whose raise-hand option is off", () => {
        inLivekit.set(true);
        meetingRaiseHandStore.set(false);
        inConversation.set(true); // the meeting itself is a remote conversation
        expect(get(raiseHandAvailableStore)).toBe(false);
    });

    it("shows for a megaphone listener whose zone allows raising hands", () => {
        inMegaphoneZoneStore.set(true);
        megaphoneRaiseHandStore.set(true);
        expect(get(raiseHandAvailableStore)).toBe(true);
    });

    it("stays hidden in a listener zone whose raise-hand option is off", () => {
        inMegaphoneZoneStore.set(true);
        megaphoneRaiseHandStore.set(false);
        inConversation.set(true);
        expect(get(raiseHandAvailableStore)).toBe(false);
    });

    it("shows for the room-level megaphone audience, which has no zone to configure", () => {
        receiveGlobalMegaphone();
        expect(get(raiseHandAvailableStore)).toBe(true);
    });

    it("is hidden for a genuine zone speaker, who is the host", () => {
        inMegaphoneZoneStore.set(true);
        megaphoneRaiseHandStore.set(true);
        speaker.set(true);
        expect(get(raiseHandAvailableStore)).toBe(false);
    });

    it("is hidden in a silent zone", () => {
        inLivekit.set(true);
        meetingRaiseHandStore.set(true);
        silent.set(true);
        expect(get(raiseHandAvailableStore)).toBe(false);
    });

    it("stays visible while holding a granted floor, so the floor can be handed back", () => {
        // The floor holder has left the zone that offered the button (or is a promoted speaker): the
        // same control is now "give the floor back" and must remain reachable.
        grantedFloor.set({});
        speaker.set(true);
        expect(get(raiseHandAvailableStore)).toBe(true);
    });
});
