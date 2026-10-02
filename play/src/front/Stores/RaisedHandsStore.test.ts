import { type Writable, get } from "svelte/store";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { RaisedHand, RaisedHandSection, SpaceInterface } from "../Space/SpaceInterface";

// The raise-hand stores derive from the per-space sections exposed by PeerStore. Mock it with a plain writable.
vi.mock("./PeerStore", async () => {
    const { writable: w } = await import("svelte/store");
    return { raisedHandSectionsStore: w<RaisedHandSection[]>([]) };
});

import { raisedHandSectionsStore } from "./PeerStore";
import { findHandPosition, raisedHandsOrderStore, raisedHandPlayerIdsStore } from "./RaisedHandsStore";

const sections = raisedHandSectionsStore as unknown as Writable<RaisedHandSection[]>;

function section(spaceName: string, hands: RaisedHand[], roomUserIds = new Map<string, number>()): RaisedHandSection {
    const space = {
        getName: () => spaceName,
        getSpaceUserBySpaceUserId: (spaceUserId: string) => {
            const roomUserId = roomUserIds.get(spaceUserId);
            return roomUserId === undefined ? undefined : { roomUserId };
        },
    } as unknown as SpaceInterface;
    return { space, hands, speakers: [], onAirHere: false };
}

const alice = { spaceUserId: "room_1", name: "Alice", at: 1000 };
const bob = { spaceUserId: "room_2", name: "Bob", at: 2000 };
const carol = { spaceUserId: "room_3", name: "Carol", at: 500 };

describe("raisedHandsOrderStore", () => {
    afterEach(() => sections.set([]));

    it("numbers each space's queue on its own", () => {
        // Carol raised her hand for the megaphone first; in the bubble, Bob is still first.
        sections.set([section("bubble", [bob, alice]), section("megaphone", [carol, bob])]);

        const order = get(raisedHandsOrderStore);
        expect(findHandPosition(order, "bubble", bob.spaceUserId)).toEqual({ position: 1, queueSize: 2 });
        expect(findHandPosition(order, "megaphone", bob.spaceUserId)).toEqual({ position: 2, queueSize: 2 });
    });

    it("does not show a hand raised in another space on a tile of this one", () => {
        sections.set([section("bubble", [alice]), section("megaphone", [carol])]);

        expect(findHandPosition(get(raisedHandsOrderStore), "bubble", carol.spaceUserId)).toBeUndefined();
    });

    it("looks the local tile's hand up in every queue, as its space is a placeholder", () => {
        sections.set([section("bubble", [alice]), section("megaphone", [carol, bob])]);

        expect(findHandPosition(get(raisedHandsOrderStore), undefined, bob.spaceUserId)).toEqual({
            position: 2,
            queueSize: 2,
        });
    });

    it("renumbers when the queue changes (e.g. the first lowers their hand)", () => {
        sections.set([section("bubble", [alice, bob])]);
        sections.set([section("bubble", [bob])]);

        const order = get(raisedHandsOrderStore);
        expect(findHandPosition(order, "bubble", alice.spaceUserId)).toBeUndefined();
        expect(findHandPosition(order, "bubble", bob.spaceUserId)).toEqual({ position: 1, queueSize: 1 });
    });
});

describe("raisedHandPlayerIdsStore", () => {
    afterEach(() => sections.set([]));

    it("parses the numeric player id of every raised hand, whatever its space", () => {
        sections.set([section("bubble", [alice]), section("megaphone", [bob, alice])]);

        expect([...get(raisedHandPlayerIdsStore)].sort()).toEqual([1, 2]);
    });

    it("ignores spaceUserIds without a numeric suffix (e.g. the local user)", () => {
        sections.set([section("bubble", [{ spaceUserId: "local", name: "Me", at: 1 }])]);
        expect(get(raisedHandPlayerIdsStore).size).toBe(0);
    });

    it("takes the player id the pusher sent with the user when the spaceUserId ends with a hash", () => {
        const dave = { spaceUserId: "room_9f86d081884c7d659a2feaa0c55ad015", name: "Dave", at: 1 };
        sections.set([section("bubble", [dave], new Map([[dave.spaceUserId, 42]]))]);

        expect([...get(raisedHandPlayerIdsStore)]).toEqual([42]);
    });

    it("never reads a player id out of a hash that starts with digits", () => {
        // parseInt("3fa9…") would answer 3, someone else's Woka
        const erin = { spaceUserId: "room_3fa9d081884c7d659a2feaa0c55ad015", name: "Erin", at: 1 };
        sections.set([section("bubble", [erin])]);

        expect(get(raisedHandPlayerIdsStore).size).toBe(0);
    });
});
