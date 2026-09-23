import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { JoinRoomMessage, PositionMessage_Direction } from "@workadventure/messages";
import { GameRoom } from "../src/Model/GameRoom";
import type { Group } from "../src/Model/Group";
import type { User, UserSocket } from "../src/Model/User";

// A pusher restarting cancels the gRPC streams of all its users. These tests pin what the room does with them: keep
// their place and their bubble for a while, and hand the bubble to the same tab when it reconnects.

const ROOM_URL = "https://play.workadventu.re/_/global/localhost/test.json";

function socket(): UserSocket {
    return { write: vi.fn().mockReturnValue(true), end: vi.fn() } as unknown as UserSocket;
}

function joinMessage(uuid: string, x: number, tabId: string): JoinRoomMessage {
    return JoinRoomMessage.fromPartial({
        userUuid: uuid,
        IPAddress: "10.0.0.2",
        name: uuid,
        positionMessage: { x, y: 100, direction: PositionMessage_Direction.DOWN, moving: false },
        tabId,
    });
}

async function setup() {
    const connected: { user: User; group: Group }[] = [];
    const disconnected: { user: User; group: Group }[] = [];
    const room = await GameRoom.create(
        ROOM_URL,
        (user, group) => connected.push({ user, group }),
        (user, group) => disconnected.push({ user, group }),
        160,
        160,
        () => {},
        () => {},
        () => {},
        () => {},
        () => {},
        () => {},
        () => {},
    );
    const alice = await room.join(socket(), joinMessage("alice", 100, "alice-tab"));
    const bob = await room.join(socket(), joinMessage("bob", 150, "bob-tab"));
    connected.length = 0;
    return { room, alice, bob, connected, disconnected };
}

describe("GameRoom users whose pusher went away", () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });
    afterEach(() => {
        vi.useRealTimers();
    });

    it("keeps them in their bubble while the grace period runs", async () => {
        const { room, alice, bob, disconnected } = await setup();
        const bubble = bob.group;
        expect(bubble).toBeDefined();

        room.detach(alice, 30_000, vi.fn());

        expect(alice.group).toBe(bubble);
        expect(bob.group).toBe(bubble);
        expect(disconnected).toEqual([]);
    });

    it("hands the bubble to the same tab reconnecting, keeping its space", async () => {
        const { room, alice, bob, connected, disconnected } = await setup();
        const bubble = bob.group;
        room.detach(alice, 30_000, vi.fn());

        const aliceAgain = await room.join(socket(), joinMessage("alice", 100, "alice-tab"));

        expect(aliceAgain.group).toBe(bubble);
        expect(bob.group).toBe(bubble);
        expect(bubble?.getUsers()).toEqual([bob, aliceAgain]);
        // The reconnected tab is asked to join the very same bubble space; Bob is told nothing.
        expect(connected.map(({ user, group }) => [user, group.spaceName])).toEqual([[aliceAgain, bubble?.spaceName]]);
        expect(disconnected.filter(({ user }) => user === bob)).toEqual([]);
    });

    it("lets them leave when the grace period runs out", async () => {
        const { room, alice } = await setup();
        const onGraceOver = vi.fn(() => room.leave(alice));
        room.detach(alice, 30_000, onGraceOver);

        vi.advanceTimersByTime(30_000);

        expect(onGraceOver).toHaveBeenCalledTimes(1);
        expect(room.getUserById(alice.id)).toBeUndefined();
    });

    it("does not pair a newcomer with a detached user", async () => {
        const { room, alice, bob } = await setup();
        room.detach(alice, 30_000, vi.fn());
        room.leave(bob);

        const carol = await room.join(socket(), joinMessage("carol", 120, "carol-tab"));

        expect(carol.group).toBeUndefined();
    });

    it("drops what is written to a detached user", async () => {
        const { room, alice } = await setup();
        room.detach(alice, 30_000, vi.fn());

        expect(alice.write({ $case: "errorMessage", errorMessage: { message: "lost" } })).toBe(false);
    });
});
