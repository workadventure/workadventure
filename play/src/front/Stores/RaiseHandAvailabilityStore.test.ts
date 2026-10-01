import { type Writable, get, writable } from "svelte/store";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { SpaceInterface } from "../Space/SpaceInterface";

// Mock every store raiseHandSpacesStore derives from (except the zone-settings and raise-hand ones, which are
// already plain writables) so the module loads without pulling the real Phaser-heavy stores.
vi.mock("./MediaStore", async () => {
    const { writable: w } = await import("svelte/store");
    return { isSpeakerStore: w(false), silentStore: w(false) };
});
vi.mock("./MegaphoneStore", async () => {
    const { writable: w } = await import("svelte/store");
    return { givenFloorSpaceStore: w<unknown>(undefined), requestedMegaphoneStore: w(false) };
});
vi.mock("./PeerStore", async () => {
    const { writable: w } = await import("svelte/store");
    return { mediaSynchronizedSpacesStore: w<unknown[]>([]) };
});

import { isSpeakerStore, silentStore } from "./MediaStore";
import { givenFloorSpaceStore, requestedMegaphoneStore } from "./MegaphoneStore";
import { mediaSynchronizedSpacesStore } from "./PeerStore";
import { requestedHandRaiseState } from "./RaiseHandStore";
import { meetingRaiseHandStore, megaphoneRaiseHandSpacesStore } from "./RaiseHandZoneSettingsStore";
import { raiseHandAvailableStore, raiseHandSpacesStore } from "./RaiseHandAvailabilityStore";

// The real silentStore is a custom store with no set(); the mock above replaces it with a plain writable.
const silent = silentStore as unknown as Writable<boolean>;
const grantedFloor = givenFloorSpaceStore as unknown as Writable<unknown>;
const syncedSpaces = mediaSynchronizedSpacesStore as unknown as Writable<SpaceInterface[]>;

function fakeSpace(kind: SpaceInterface["kind"], name: string, onAir = false) {
    const isStreamingAudioStore = writable(onAir);
    const space = { kind, getName: () => name, isStreamingAudioStore } as unknown as SpaceInterface;
    return { space, isStreamingAudioStore };
}

const bubble = fakeSpace("bubble", "room#group#1").space;
const meeting = fakeSpace("area", "meeting-room").space;
const listenerZone = fakeSpace("speaker_zone", "podium").space;
const world = fakeSpace(undefined, "world").space;

const names = () => get(raiseHandSpacesStore).map((space) => space.getName());

describe("raiseHandSpacesStore", () => {
    afterEach(() => {
        isSpeakerStore.set(false);
        silent.set(false);
        grantedFloor.set(undefined);
        requestedMegaphoneStore.set(false);
        syncedSpaces.set([]);
        meetingRaiseHandStore.set(false);
        megaphoneRaiseHandSpacesStore.set(new Set());
        requestedHandRaiseState.lowerAll();
    });

    it("is empty and hides the button when alone, outside any conversation", () => {
        syncedSpaces.set([world]);
        expect(names()).toEqual([]);
        expect(get(raiseHandAvailableStore)).toBe(false);
    });

    it("offers a proximity bubble, where the queue lets whoever leads give the floor orally", () => {
        syncedSpaces.set([bubble]);
        expect(names()).toEqual(["room#group#1"]);
        expect(get(raiseHandAvailableStore)).toBe(true);
    });

    it("offers a meeting room only while its raise-hand option is on", () => {
        syncedSpaces.set([meeting]);
        expect(get(raiseHandAvailableStore)).toBe(false);

        meetingRaiseHandStore.set(true);
        expect(names()).toEqual(["meeting-room"]);
    });

    it("offers a listener zone only while its raise-hand option is on", () => {
        syncedSpaces.set([listenerZone]);
        expect(get(raiseHandAvailableStore)).toBe(false);

        megaphoneRaiseHandSpacesStore.set(new Set(["podium"]));
        expect(names()).toEqual(["podium"]);
    });

    it("still offers the bubble inside a listener zone whose option is off", () => {
        syncedSpaces.set([bubble, listenerZone]);
        expect(names()).toEqual(["room#group#1"]);
    });

    it("offers both a bubble and the listener zone it stands in, so the user picks", () => {
        syncedSpaces.set([bubble, listenerZone]);
        megaphoneRaiseHandSpacesStore.set(new Set(["podium"]));
        expect(names()).toEqual(["room#group#1", "podium"]);
    });

    it("offers the room-level megaphone only while someone is on air", () => {
        const megaphone = fakeSpace("megaphone", "megaphone-room");
        syncedSpaces.set([megaphone.space]);
        expect(names()).toEqual([]);

        megaphone.isStreamingAudioStore.set(true);
        expect(names()).toEqual(["megaphone-room"]);
    });

    it("does not offer the room-level megaphone to the one broadcasting in it", () => {
        syncedSpaces.set([fakeSpace("megaphone", "megaphone-room", true).space]);
        requestedMegaphoneStore.set(true);
        expect(names()).toEqual([]);
    });

    it("leaves the room-level megaphone out as soon as another space qualifies", () => {
        syncedSpaces.set([bubble, fakeSpace("megaphone", "megaphone-room", true).space]);
        expect(names()).toEqual(["room#group#1"]);
    });

    it("keeps a space the hand is up in, so it can still be lowered", () => {
        // Bob raised his hand during a megaphone live, then a bubble formed around him.
        const megaphone = fakeSpace("megaphone", "megaphone-room", true).space;
        syncedSpaces.set([megaphone]);
        requestedHandRaiseState.raise("megaphone-room");
        syncedSpaces.set([bubble, megaphone]);
        expect(names()).toEqual(["room#group#1", "megaphone-room"]);
    });

    it("hides the button from a genuine zone speaker, who is the host", () => {
        syncedSpaces.set([bubble]);
        isSpeakerStore.set(true);
        expect(get(raiseHandAvailableStore)).toBe(false);
    });

    it("hides the button in a silent zone", () => {
        syncedSpaces.set([bubble]);
        silent.set(true);
        expect(get(raiseHandAvailableStore)).toBe(false);
    });

    it("keeps the button while holding a granted floor, so the floor can be handed back", () => {
        // The floor holder has left the zone that offered the button (or is a promoted speaker): the
        // same control is now "give the floor back" and must remain reachable.
        grantedFloor.set({});
        isSpeakerStore.set(true);
        expect(get(raiseHandAvailableStore)).toBe(true);
    });
});
