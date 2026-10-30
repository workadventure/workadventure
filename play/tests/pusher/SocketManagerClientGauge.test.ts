import { afterEach, describe, expect, it, vi } from "vitest";
import { mock } from "vitest-mock-extended";
import type { JoinRoomFrontMessage } from "@workadventure/messages";

vi.mock("../../src/pusher/enums/EnvironmentVariable", () => import("./mocks/pusherEnvironmentVariableMock"));

import { SocketManager } from "../../src/pusher/services/SocketManager";
import { clientEventsEmitter } from "../../src/pusher/services/ClientEventsEmitter";
import type { PusherWebSocket } from "../../src/pusher/services/PusherWebSocket";
import type { PusherRoom } from "../../src/pusher/models/PusherRoom";

const ROOM = "https://play.test/@/org/world/room";

/**
 * workadventure_nb_sockets is incremented on a client join and decremented on a client leave. A leave without its
 * join drove the gauge below zero in production, so every socket must emit at most one leave, and only after a join.
 */
describe("SocketManager client join/leave events", () => {
    afterEach(() => vi.restoreAllMocks());

    function setup(backWrite: () => void = () => undefined) {
        const join = vi.spyOn(clientEventsEmitter, "emitClientJoin");
        const leave = vi.spyOn(clientEventsEmitter, "emitClientLeave");
        const manager = new SocketManager();
        vi.spyOn(manager, "getOrCreateRoom").mockResolvedValue(mock<PusherRoom>());
        const socketData = {
            roomId: ROOM,
            userUuid: "user",
            joinedRoom: false,
            spaces: new Set<string>(),
            currentChatRoomArea: [],
            backConnection: { write: backWrite, end: vi.fn() },
        };
        const socket = mock<PusherWebSocket>({
            getUserData: vi.fn().mockReturnValue(socketData),
            isDisconnecting: vi.fn().mockReturnValue(false),
        });
        const joinRoom = () => manager.handleJoinRoom(socket, {} as JoinRoomFrontMessage);
        return { manager, socket, join, leave, joinRoom };
    }

    it("emits no leave for a socket that closes before joining", () => {
        const { manager, socket, join, leave } = setup();
        manager.cleanupSocket(socket);
        expect(join).not.toHaveBeenCalled();
        expect(leave).not.toHaveBeenCalled();
    });

    it("emits one join and one leave, even when the socket is cleaned up twice", async () => {
        const { manager, socket, join, leave, joinRoom } = setup();
        await joinRoom();
        await joinRoom();
        manager.cleanupSocket(socket);
        manager.cleanupSocket(socket);
        expect(join).toHaveBeenCalledTimes(1);
        expect(leave).toHaveBeenCalledTimes(1);
    });

    it("emits a single leave when the join fails", async () => {
        const { join, leave, joinRoom } = setup(() => {
            throw new Error("back is down");
        });
        await joinRoom();
        expect(join).toHaveBeenCalledTimes(1);
        expect(leave).toHaveBeenCalledTimes(1);
    });
});
