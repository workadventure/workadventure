import { type Writable, writable } from "svelte/store";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { VideoBox } from "../Space/VideoBox";

// The ordering store derives the set of tiles from streamableCollectionStore. Mock it with a plain writable.
vi.mock("./StreamableCollectionStore", async () => {
    const { writable: w } = await import("svelte/store");
    return { streamableCollectionStore: w(new Map<string, VideoBox>()) };
});

import { streamableCollectionStore } from "./StreamableCollectionStore";
import { raisedHandsOrderStore, raisedHandUuidsStore } from "./RaisedHandsStore";

const collection = streamableCollectionStore as unknown as Writable<Map<string, VideoBox>>;

function fakeBox(uniqueId: string, raised: boolean, raisedAt: number, uuid: string = uniqueId) {
    const handRaised = writable(raised);
    const handRaisedAt = writable(raisedAt);
    const box = {
        uniqueId,
        spaceUser: { reactiveUser: { handRaised, handRaisedAt, uuid: writable(uuid) } },
    } as unknown as VideoBox;
    return { box, handRaised, handRaisedAt };
}

function boxesMap(...boxes: VideoBox[]): Map<string, VideoBox> {
    return new Map(boxes.map((b) => [b.uniqueId, b]));
}

describe("RaisedHandsStore", () => {
    let latest: Map<string, number> = new Map();
    let unsubscribe: () => void;

    beforeEach(() => {
        collection.set(new Map());
        unsubscribe = raisedHandsOrderStore.subscribe((value) => (latest = value));
    });

    afterEach(() => {
        unsubscribe();
        collection.set(new Map());
    });

    it("returns no positions when nobody raised their hand", () => {
        const a = fakeBox("a", false, 0);
        const b = fakeBox("b", false, 0);
        collection.set(boxesMap(a.box, b.box));

        expect(latest.size).toBe(0);
    });

    it("orders raised hands by the moment they were raised", () => {
        const a = fakeBox("a", true, 2000);
        const b = fakeBox("b", true, 1000);
        const c = fakeBox("c", false, 0);
        collection.set(boxesMap(a.box, b.box, c.box));

        // b raised first (1000) -> position 1, a second (2000) -> position 2, c not raised -> absent
        expect(latest.get("b")).toBe(1);
        expect(latest.get("a")).toBe(2);
        expect(latest.has("c")).toBe(false);
    });

    it("reacts when a tile raises its hand", () => {
        const a = fakeBox("a", true, 1000);
        const b = fakeBox("b", false, 0);
        collection.set(boxesMap(a.box, b.box));

        expect(latest.get("a")).toBe(1);
        expect(latest.has("b")).toBe(false);

        // b raises its hand after a
        b.handRaisedAt.set(2000);
        b.handRaised.set(true);

        expect(latest.get("a")).toBe(1);
        expect(latest.get("b")).toBe(2);
    });

    it("recomputes positions when a tile lowers its hand", () => {
        const a = fakeBox("a", true, 1000);
        const b = fakeBox("b", true, 2000);
        collection.set(boxesMap(a.box, b.box));

        expect(latest.get("a")).toBe(1);
        expect(latest.get("b")).toBe(2);

        // a lowers its hand -> b becomes first
        a.handRaised.set(false);
        a.handRaisedAt.set(0);

        expect(latest.has("a")).toBe(false);
        expect(latest.get("b")).toBe(1);
    });

    it("tie-breaks equal timestamps deterministically by uniqueId", () => {
        const b = fakeBox("b", true, 1000);
        const a = fakeBox("a", true, 1000);
        collection.set(boxesMap(b.box, a.box));

        expect(latest.get("a")).toBe(1);
        expect(latest.get("b")).toBe(2);
    });
});

describe("raisedHandUuidsStore", () => {
    let latest = new Set<string>();
    let unsubscribe: () => void;

    beforeEach(() => {
        collection.set(new Map());
        unsubscribe = raisedHandUuidsStore.subscribe((value) => (latest = value));
    });

    afterEach(() => {
        unsubscribe();
        collection.set(new Map());
    });

    it("exposes the uuids of participants whose hand is raised", () => {
        const a = fakeBox("a", true, 1000, "uuid-a");
        const b = fakeBox("b", false, 0, "uuid-b");
        collection.set(boxesMap(a.box, b.box));

        expect(latest.has("uuid-a")).toBe(true);
        expect(latest.has("uuid-b")).toBe(false);
        expect(latest.size).toBe(1);
    });

    it("reacts to a hand being raised and lowered", () => {
        const a = fakeBox("a", false, 0, "uuid-a");
        collection.set(boxesMap(a.box));
        expect(latest.size).toBe(0);

        a.handRaised.set(true);
        expect(latest.has("uuid-a")).toBe(true);

        a.handRaised.set(false);
        expect(latest.has("uuid-a")).toBe(false);
    });
});
