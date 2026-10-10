import { Subject } from "rxjs";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { WAMFileFormat } from "@workadventure/map-editor";
import type { SubMessage, WhiteboardStorageKey } from "@workadventure/messages";
import type { User } from "../src/Model/User";
import { WhiteboardManager, WHITEBOARD_EVICT_DELAY_MS } from "../src/Model/Whiteboard/WhiteboardManager";
import type { WhiteboardPersistence } from "../src/Model/Whiteboard/WhiteboardPersistence";
import type { WhiteboardElement } from "../src/Model/Whiteboard/WhiteboardScene";

const rect = (id: string, version = 1): WhiteboardElement => ({
    id,
    type: "rectangle",
    index: "a0",
    version,
    versionNonce: 1,
});

function makeRoom(ephemeral = false) {
    const wam = {
        version: "1.0.0",
        mapUrl: "map.tmj",
        entities: {},
        areas: [
            {
                id: "area",
                name: "Atelier",
                x: 0,
                y: 0,
                width: 10,
                height: 10,
                visible: true,
                properties: [{ id: "board", type: "whiteboard", ephemeral }],
            },
        ],
    } as unknown as WAMFileFormat;
    return {
        wamUrl: "http://map-storage/maps/office.wam",
        getWam: () => wam,
        userLeaveStream: new Subject<User>(),
        destroyRoomStream: new Subject<void>(),
    };
}

function makeUser(id: number): User & { received: SubMessage[] } {
    const received: SubMessage[] = [];
    return {
        id,
        uuid: `user-${id}`,
        name: `User ${id}`,
        tags: [],
        canEdit: false,
        disconnected: false,
        received,
        emitInBatch: (message: SubMessage) => received.push(message),
    } as unknown as User & { received: SubMessage[] };
}

const join = { areaId: "area", propertyId: "board", message: { $case: "join" as const, join: {} } };
const leave = { areaId: "area", propertyId: "board", message: { $case: "leave" as const, leave: {} } };
const draw = (elements: WhiteboardElement[]) => ({
    areaId: "area",
    propertyId: "board",
    message: { $case: "elements" as const, elements: { elementsJson: JSON.stringify(elements) } },
});

function sceneOf(user: { received: SubMessage[] }): unknown[] {
    const scene = user.received
        .map((m) =>
            m.message?.$case === "whiteboardServerMessage" ? m.message.whiteboardServerMessage.message : undefined,
        )
        .find((m) => m?.$case === "scene");
    return scene?.$case === "scene" ? (JSON.parse(scene.scene.elementsJson) as unknown[]) : [];
}

describe("WhiteboardManager persistence", () => {
    let stored: Map<string, WhiteboardElement[]>;
    let persistence: WhiteboardPersistence & { saves: number };

    beforeEach(() => {
        vi.useFakeTimers();
        stored = new Map([["area/board", [rect("from-storage")]]]);
        const counting = { saves: 0 };
        persistence = Object.assign(counting, {
            load: (key: WhiteboardStorageKey) => Promise.resolve(stored.get(`${key.areaId}/${key.propertyId}`) ?? []),
            save: (key: WhiteboardStorageKey, elements: WhiteboardElement[]) => {
                counting.saves++;
                stored.set(`${key.areaId}/${key.propertyId}`, elements);
                return Promise.resolve();
            },
        });
    });
    afterEach(() => vi.useRealTimers());

    it("loads the stored board on the first join and saves it when the last person leaves", async () => {
        const manager = new WhiteboardManager(makeRoom(), persistence);
        const alice = makeUser(1);
        await manager.handleMessage(alice, join);
        expect(sceneOf(alice)).toEqual([rect("from-storage")]);

        await manager.handleMessage(alice, draw([rect("new")]));
        expect(persistence.saves).toBe(0);
        await manager.handleMessage(alice, leave);
        await vi.runOnlyPendingTimersAsync();
        expect(stored.get("area/board")?.map((element) => element.id)).toEqual(["from-storage", "new"]);
    });

    it("never writes an ephemeral board and forgets it once empty", async () => {
        const manager = new WhiteboardManager(makeRoom(true), persistence);
        const alice = makeUser(1);
        await manager.handleMessage(alice, join);
        expect(sceneOf(alice)).toEqual([]);
        await manager.handleMessage(alice, draw([rect("scribble")]));
        await manager.handleMessage(alice, leave);
        await vi.advanceTimersByTimeAsync(WHITEBOARD_EVICT_DELAY_MS + 1);
        expect(persistence.saves).toBe(0);

        const bob = makeUser(2);
        await manager.handleMessage(bob, join);
        expect(sceneOf(bob)).toEqual([]);
    });

    it("does not start from an empty board when the stored one cannot be loaded", async () => {
        persistence.load = () => Promise.reject(new Error("map-storage down"));
        const manager = new WhiteboardManager(makeRoom(), persistence);
        const alice = makeUser(1);
        await manager.handleMessage(alice, join);
        expect(alice.received).toHaveLength(0);
        await manager.handleMessage(alice, draw([rect("lost")]));
        await vi.runOnlyPendingTimersAsync();
        expect(persistence.saves).toBe(0);
    });
});
