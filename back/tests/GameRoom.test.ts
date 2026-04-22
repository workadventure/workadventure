/* eslint-disable @typescript-eslint/no-unused-vars */
import { describe, expect, it, vi } from "vitest";
import { JoinRoomMessage, PositionMessage_Direction, RoomJoinedMessage } from "@workadventure/messages";
import type { ConnectCallback, DisconnectCallback } from "../src/Model/GameRoom";
import { GameRoom } from "../src/Model/GameRoom";
import { Point } from "../src/Model/Websocket/MessageUserPosition";
import type { Group } from "../src/Model/Group";
import type { User, UserSocket } from "../src/Model/User";
import type { EmoteCallback } from "../src/Model/Zone";

function createMockUser(userId: number): User {
    return {
        userId,
    } as unknown as User;
}

function createMockUserSocket() {
    const write = vi.fn().mockReturnValue(true);
    const end = vi.fn();

    return {
        socket: {
            write,
            end,
        } as unknown as UserSocket,
        write,
        end,
    };
}

function createJoinRoomMessage(uuid: string, x: number, y: number, tabId?: string): JoinRoomMessage {
    return JoinRoomMessage.fromPartial({
        userUuid: uuid,
        IPAddress: "10.0.0.2",
        name: "foo",
        positionMessage: {
            x,
            y,
            direction: PositionMessage_Direction.DOWN,
            moving: false,
        },
        tabId,
    } as const);
}

function flushPendingMessages(user: User): void {
    user.write({
        $case: "roomJoinedMessage",
        roomJoinedMessage: RoomJoinedMessage.fromPartial({
            currentUserId: user.id,
        }),
    });
}

function isServerMessageChunk(chunk: unknown): chunk is { message: { $case: string } } {
    return typeof chunk === "object" && chunk !== null && "message" in chunk;
}

function getWrittenMessageCases(socket: ReturnType<typeof createMockUserSocket>): string[] {
    return socket.write.mock.calls
        .map((call): unknown => call[0])
        .filter(isServerMessageChunk)
        .map((chunk) => chunk.message.$case);
}

const emote: EmoteCallback = (emoteEventMessage, listener): void => {};

describe("GameRoom", () => {
    it("should connect user1 and user2", async () => {
        let connectCalledNumber = 0;
        const connect: ConnectCallback = (user: User, group: Group): void => {
            connectCalledNumber++;
        };
        const disconnect: DisconnectCallback = (user: User, group: Group): void => {};

        const world = await GameRoom.create(
            "https://play.workadventu.re/_/global/localhost/test.json",
            connect,
            disconnect,
            160,
            160,
            () => {},
            () => {},
            () => {},
            emote,
            () => {},
            () => {},
            () => {}
        );

        const user1Socket = createMockUserSocket();
        const user1 = await world.join(user1Socket.socket, createJoinRoomMessage("1", 100, 100));

        const user2Socket = createMockUserSocket();
        const user2 = await world.join(user2Socket.socket, createJoinRoomMessage("2", 500, 100));

        world.updatePosition(user2, new Point(261, 100));

        expect(connectCalledNumber).toBe(0);

        world.updatePosition(user2, new Point(101, 100));

        expect(connectCalledNumber).toBe(2);

        world.updatePosition(user2, new Point(102, 100));
        expect(connectCalledNumber).toBe(2);
    });

    it("should connect 3 users", async () => {
        let connectCalled = false;
        const connect: ConnectCallback = (user: User, group: Group): void => {
            connectCalled = true;
        };
        const disconnect: DisconnectCallback = (user: User, group: Group): void => {};

        const world = await GameRoom.create(
            "https://play.workadventu.re/_/global/localhost/test.json",
            connect,
            disconnect,
            160,
            160,
            () => {},
            () => {},
            () => {},
            emote,
            () => {},
            () => {},
            () => {}
        );

        const user1Socket = createMockUserSocket();
        const user1 = await world.join(user1Socket.socket, createJoinRoomMessage("1", 100, 100));

        const user2Socket = createMockUserSocket();
        const user2 = await world.join(user2Socket.socket, createJoinRoomMessage("2", 200, 100));

        expect(connectCalled).toBe(true);
        connectCalled = false;

        // baz joins at the outer limit of the group
        const user3Socket = createMockUserSocket();
        const user3 = await world.join(user3Socket.socket, createJoinRoomMessage("2", 311, 100));

        expect(connectCalled).toBe(false);

        world.updatePosition(user3, new Point(309, 100));

        expect(connectCalled).toBe(true);
    });

    it("should disconnect user1 and user2", async () => {
        let connectCalled = false;
        let disconnectCallNumber = 0;
        const connect: ConnectCallback = (user: User, group: Group): void => {
            connectCalled = true;
        };
        const disconnect: DisconnectCallback = (user: User, group: Group): void => {
            disconnectCallNumber++;
        };

        const world = await GameRoom.create(
            "https://play.workadventu.re/_/global/localhost/test.json",
            connect,
            disconnect,
            160,
            160,
            () => {},
            () => {},
            () => {},
            emote,
            () => {},
            () => {},
            () => {}
        );

        const user1Socket = createMockUserSocket();
        const user1 = await world.join(user1Socket.socket, createJoinRoomMessage("1", 100, 100));

        const user2Socket = createMockUserSocket();
        const user2 = await world.join(user2Socket.socket, createJoinRoomMessage("2", 259, 100));

        expect(connectCalled).toBe(true);
        expect(disconnectCallNumber).toBe(0);

        world.updatePosition(user2, new Point(100 + 160 + 160 + 1, 100));

        expect(disconnectCallNumber).toBe(2);

        world.updatePosition(user2, new Point(262, 100));
        expect(disconnectCallNumber).toBe(2);
    });

    it("should not notify duplicate user when reconnecting from the same tab", async () => {
        const world = await GameRoom.create(
            "https://play.workadventu.re/_/global/localhost/test.json",
            () => {},
            () => {},
            160,
            160,
            () => {},
            () => {},
            () => {},
            emote,
            () => {},
            () => {},
            () => {}
        );

        const firstSocket = createMockUserSocket();
        await world.join(firstSocket.socket, createJoinRoomMessage("duplicate-user", 100, 100, "tab-1"));

        const secondSocket = createMockUserSocket();
        const reconnectedUser = await world.join(
            secondSocket.socket,
            createJoinRoomMessage("duplicate-user", 100, 100, "tab-1")
        );

        expect(firstSocket.end).toHaveBeenCalledTimes(1);

        flushPendingMessages(reconnectedUser);

        expect(getWrittenMessageCases(secondSocket)).not.toContain("duplicateUserConnectedMessage");
    });

    it("should notify duplicate user when connecting from another tab", async () => {
        const world = await GameRoom.create(
            "https://play.workadventu.re/_/global/localhost/test.json",
            () => {},
            () => {},
            160,
            160,
            () => {},
            () => {},
            () => {},
            emote,
            () => {},
            () => {},
            () => {}
        );

        const firstSocket = createMockUserSocket();
        await world.join(firstSocket.socket, createJoinRoomMessage("duplicate-user", 100, 100, "tab-1"));

        const secondSocket = createMockUserSocket();
        const secondUser = await world.join(
            secondSocket.socket,
            createJoinRoomMessage("duplicate-user", 100, 100, "tab-2")
        );

        expect(firstSocket.end).not.toHaveBeenCalled();

        flushPendingMessages(secondUser);

        expect(getWrittenMessageCases(secondSocket)).toContain("duplicateUserConnectedMessage");
    });

    it("should keep duplicate detection when tabId is missing", async () => {
        const world = await GameRoom.create(
            "https://play.workadventu.re/_/global/localhost/test.json",
            () => {},
            () => {},
            160,
            160,
            () => {},
            () => {},
            () => {},
            emote,
            () => {},
            () => {},
            () => {}
        );

        const firstSocket = createMockUserSocket();
        await world.join(firstSocket.socket, createJoinRoomMessage("duplicate-user", 100, 100));

        const secondSocket = createMockUserSocket();
        const secondUser = await world.join(secondSocket.socket, createJoinRoomMessage("duplicate-user", 100, 100));

        flushPendingMessages(secondUser);

        expect(getWrittenMessageCases(secondSocket)).toContain("duplicateUserConnectedMessage");
    });
});
