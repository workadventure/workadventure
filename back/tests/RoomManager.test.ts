import { EventEmitter } from "events";
import { describe, expect, it, vi } from "vitest";
import type { PusherToBackMessage } from "@workadventure/messages";
import { ConnectToRoomMessage, JoinRoomMessage, VariableMessage } from "@workadventure/messages";
import type { UserSocket } from "../src/Model/User";

const { socketManagerMock } = vi.hoisted(() => ({
    socketManagerMock: {
        handleConnectToRoom: vi.fn(),
        handleJoinRoom: vi.fn(),
        handleVariableEvent: vi.fn(),
        leaveRoom: vi.fn(),
    },
}));
vi.mock("../src/Services/SocketManager", () => ({ socketManager: socketManagerMock }));

import { roomManager } from "../src/RoomManager";

describe("RoomManager.connectToRoom", () => {
    it("processes messages still queued when the stream ends before leaving the room", async () => {
        const room = { roomUrl: "room" };
        const user = { name: "user" };
        socketManagerMock.handleConnectToRoom.mockResolvedValue(room);
        socketManagerMock.handleJoinRoom.mockResolvedValue(user);
        let resolveVariable: () => void = () => {};
        const events: string[] = [];
        socketManagerMock.handleVariableEvent.mockImplementation(
            () =>
                new Promise<void>((resolve) => {
                    resolveVariable = () => {
                        events.push("variable");
                        resolve();
                    };
                }),
        );
        socketManagerMock.leaveRoom.mockImplementation(() => events.push("leaveRoom"));

        const call = Object.assign(new EventEmitter(), {
            writable: true,
            write: vi.fn(),
            end: vi.fn(() => {
                call.writable = false;
            }),
        });
        roomManager.connectToRoom(call as unknown as UserSocket);

        const send = (message: PusherToBackMessage["message"]) => call.emit("data", { message });
        send({ $case: "connectToRoomMessage", connectToRoomMessage: ConnectToRoomMessage.fromPartial({}) });
        send({ $case: "joinRoomMessage", joinRoomMessage: JoinRoomMessage.fromPartial({}) });
        send({ $case: "variableMessage", variableMessage: VariableMessage.fromPartial({ name: "foo" }) });
        call.emit("end");

        await vi.waitFor(() => expect(socketManagerMock.handleVariableEvent).toHaveBeenCalled());
        expect(socketManagerMock.handleVariableEvent).toHaveBeenCalledWith(room, user, expect.anything());
        expect(socketManagerMock.leaveRoom).not.toHaveBeenCalled();

        resolveVariable();
        await vi.waitFor(() => expect(socketManagerMock.leaveRoom).toHaveBeenCalledWith(room, user));
        expect(events).toEqual(["variable", "leaveRoom"]);
        expect(call.end).toHaveBeenCalledOnce();
    });
});
