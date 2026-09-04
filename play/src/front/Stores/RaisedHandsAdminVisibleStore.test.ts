import { type Writable, get } from "svelte/store";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { FloorSpeaker, RaisedHand } from "../Space/SpaceInterface";

// Mock every store raisedHandsAdminVisibleStore derives from with a plain writable, so the module loads
// without pulling the real (Phaser-heavy) stores.
vi.mock("./PeerStore", async () => {
    const { writable: w } = await import("svelte/store");
    return { raisedHandsStore: w<RaisedHand[]>([]), speakingUsersStore: w<FloorSpeaker[]>([]) };
});
vi.mock("./GameStore", async () => {
    const { writable: w } = await import("svelte/store");
    return { userIsAdminStore: w(false) };
});
vi.mock("./MediaStore", async () => {
    const { writable: w } = await import("svelte/store");
    return { isSpeakerStore: w(false), inLivekitStore: w(false) };
});
vi.mock("./MegaphoneStore", async () => {
    const { writable: w } = await import("svelte/store");
    return { givenFloorSpaceStore: w<unknown>(undefined) };
});

import { raisedHandsStore, speakingUsersStore } from "./PeerStore";
import { userIsAdminStore } from "./GameStore";
import { inLivekitStore, isSpeakerStore } from "./MediaStore";
import { givenFloorSpaceStore } from "./MegaphoneStore";
import { currentPlayerGroupIdStore } from "./CurrentPlayerGroupStore";
import { raisedHandsAdminVisibleStore } from "./RaisedHandsAdminVisibleStore";

const queue = raisedHandsStore as unknown as Writable<RaisedHand[]>;
const speakers = speakingUsersStore as unknown as Writable<FloorSpeaker[]>;
const admin = userIsAdminStore;
const speaker = isSpeakerStore;
const grantedFloor = givenFloorSpaceStore as unknown as Writable<unknown>;

describe("raisedHandsAdminVisibleStore", () => {
    const oneRaisedHand = () => queue.set([{ spaceUserId: "room_1", name: "Alice", at: 1 }]);

    const reset = () => {
        queue.set([]);
        speakers.set([]);
        admin.set(false);
        speaker.set(false);
        grantedFloor.set(undefined);
        currentPlayerGroupIdStore.set(undefined);
        inLivekitStore.set(false);
    };
    beforeEach(reset);
    afterEach(reset);

    it("is hidden when there is nothing to act on, even for an admin", () => {
        admin.set(true);
        expect(get(raisedHandsAdminVisibleStore)).toBe(false);
    });

    it("shows for an admin when a hand is raised", () => {
        admin.set(true);
        oneRaisedHand();
        expect(get(raisedHandsAdminVisibleStore)).toBe(true);
    });

    it("shows while there is an active speaker to take back, even with no raised hands", () => {
        admin.set(true);
        speakers.set([{ spaceUserId: "room_2", name: "Bob" }]);
        expect(get(raisedHandsAdminVisibleStore)).toBe(true);
    });

    it("shows for a genuine zone speaker (speaker without a granted floor)", () => {
        speaker.set(true);
        oneRaisedHand();
        expect(get(raisedHandsAdminVisibleStore)).toBe(true);
    });

    it("is hidden for a promoted guest (a speaker who holds a granted floor)", () => {
        speaker.set(true);
        grantedFloor.set({}); // holding a granted floor => promoted guest, must not moderate
        oneRaisedHand();
        expect(get(raisedHandsAdminVisibleStore)).toBe(false);
    });

    it("still shows for an admin who also holds a granted floor", () => {
        admin.set(true);
        speaker.set(true);
        grantedFloor.set({});
        oneRaisedHand();
        expect(get(raisedHandsAdminVisibleStore)).toBe(true);
    });

    it("is hidden for a plain megaphone listener", () => {
        oneRaisedHand();
        expect(get(raisedHandsAdminVisibleStore)).toBe(false);
    });

    it("shows to everyone in a proximity bubble, which has no host", () => {
        currentPlayerGroupIdStore.set(42);
        oneRaisedHand();
        expect(get(raisedHandsAdminVisibleStore)).toBe(true);
    });

    it("shows to everyone in a meeting room, where everybody already speaks", () => {
        inLivekitStore.set(true);
        oneRaisedHand();
        expect(get(raisedHandsAdminVisibleStore)).toBe(true);
    });

    it("stays hidden in a bubble while nobody has raised a hand", () => {
        currentPlayerGroupIdStore.set(42);
        expect(get(raisedHandsAdminVisibleStore)).toBe(false);
    });
});
