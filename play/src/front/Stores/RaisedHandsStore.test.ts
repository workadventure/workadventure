import { type Writable, get } from "svelte/store";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { RaisedHand } from "../Space/SpaceInterface";

// The raise-hand stores derive from the (metadata-sourced) queue exposed by PeerStore. Mock it with a plain writable.
vi.mock("./PeerStore", async () => {
    const { writable: w } = await import("svelte/store");
    return { raisedHandsStore: w<RaisedHand[]>([]) };
});

import { raisedHandsStore } from "./PeerStore";
import { raisedHandsOrderStore, raisedHandPlayerIdsStore } from "./RaisedHandsStore";

const queue = raisedHandsStore as unknown as Writable<RaisedHand[]>;

describe("raisedHandsOrderStore", () => {
    beforeEach(() => queue.set([]));
    afterEach(() => queue.set([]));

    it("maps each spaceUserId to its 1-based position in the queue order", () => {
        queue.set([
            { spaceUserId: "room_1", name: "Alice", at: 1000 },
            { spaceUserId: "room_2", name: "Bob", at: 2000 },
        ]);

        const order = get(raisedHandsOrderStore);
        expect(order.get("room_1")).toBe(1);
        expect(order.get("room_2")).toBe(2);
        expect(order.size).toBe(2);
    });

    it("is empty when nobody raised their hand", () => {
        queue.set([]);
        expect(get(raisedHandsOrderStore).size).toBe(0);
    });

    it("reorders when the queue changes (e.g. the first lowers their hand)", () => {
        queue.set([
            { spaceUserId: "room_1", name: "Alice", at: 1000 },
            { spaceUserId: "room_2", name: "Bob", at: 2000 },
        ]);
        queue.set([{ spaceUserId: "room_2", name: "Bob", at: 2000 }]);

        const order = get(raisedHandsOrderStore);
        expect(order.has("room_1")).toBe(false);
        expect(order.get("room_2")).toBe(1);
    });
});

describe("raisedHandPlayerIdsStore", () => {
    beforeEach(() => queue.set([]));
    afterEach(() => queue.set([]));

    it("parses the numeric player id from each spaceUserId", () => {
        queue.set([
            { spaceUserId: "room_5", name: "Alice", at: 1 },
            { spaceUserId: "room_6", name: "Bob", at: 2 },
        ]);

        const ids = get(raisedHandPlayerIdsStore);
        expect(ids.has(5)).toBe(true);
        expect(ids.has(6)).toBe(true);
        expect(ids.size).toBe(2);
    });

    it("ignores spaceUserIds without a numeric suffix (e.g. the local user)", () => {
        queue.set([{ spaceUserId: "local", name: "Me", at: 1 }]);
        expect(get(raisedHandPlayerIdsStore).size).toBe(0);
    });
});
