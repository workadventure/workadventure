import { EventEmitter } from "events";
import { afterEach, describe, expect, it, vi } from "vitest";
import { mock } from "vitest-mock-extended";
import { register } from "prom-client";
import type { JoinRoomFrontMessage } from "@workadventure/messages";

vi.mock("../../src/pusher/enums/EnvironmentVariable", () => import("./mocks/pusherEnvironmentVariableMock"));

const backStreams = vi.hoisted(() => [] as EventEmitter[]);
vi.mock("../../src/pusher/services/ApiClientRepository", () => ({
    apiClientRepository: {
        getClient: () =>
            Promise.resolve({
                getChannel: () => ({ getTarget: () => "back.test" }),
                connectToRoom: () => backStreams[backStreams.length - 1],
            }),
    },
}));

// The exported singleton, not a new instance: every SocketManager registers its own gauge listeners.
import { socketManager } from "../../src/pusher/services/SocketManager";
import type { PusherWebSocket } from "../../src/pusher/services/PusherWebSocket";
import type { PusherRoom } from "../../src/pusher/models/PusherRoom";
import type { SocketData } from "../../src/pusher/models/Websocket/SocketData";

const ROOM = "https://play.test/_/global/maps.test/map.wam";

const gauge = async (name: string) => (await register.getSingleMetric(name)?.get())?.values ?? [];
const nbSockets = async () => (await gauge("workadventure_nb_sockets"))[0]?.value;
const nbClientsInRoom = async () =>
    (await gauge("workadventure_nb_clients_per_room")).find(({ labels }) => labels.room === ROOM)?.value ?? 0;

/**
 * A socket connected to the back, the way the "open" handler leaves it. Like the real PusherWebSocket, it only
 * reports isDisconnecting() once end() was called: a client that closes its WebSocket itself never gets there.
 */
const connect = async (userUuid: string) => {
    const backStream = Object.assign(new EventEmitter(), { write: vi.fn(), end: vi.fn() });
    backStreams.push(backStream);

    let disconnecting = false;
    const socketData = {
        roomId: ROOM,
        userUuid,
        tabId: userUuid,
        tags: [],
        spaces: new Set<string>(),
        joinSpacesPromise: new Map<string, Promise<void>>(),
        currentChatRoomArea: [],
    } as unknown as SocketData;
    const socket = mock<PusherWebSocket>({
        getUserData: () => socketData,
        isDisconnecting: () => disconnecting,
        isPermanentlyDisconnected: () => true,
        end: () => {
            disconnecting = true;
        },
    });

    await socketManager.handleConnectToRoom(socket);

    return { socket, backStream };
};

const join = (socket: PusherWebSocket) => socketManager.handleJoinRoom(socket, mock<JoinRoomFrontMessage>());

describe("SocketManager client gauges", () => {
    vi.spyOn(socketManager, "getOrCreateRoom").mockResolvedValue(mock<PusherRoom>());

    afterEach(() => {
        backStreams.length = 0;
    });

    it("counts a client once when the back stream ends after the WebSocket closed", async () => {
        const alice = await connect("alice");
        const bob = await connect("bob");
        await join(alice.socket);
        await join(bob.socket);
        expect(await nbSockets()).toBe(2);
        expect(await nbClientsInRoom()).toBe(2);

        // Alice closes her tab: the "close" handler cleans up and ends the back stream...
        socketManager.cleanupSocket(alice.socket);
        expect(alice.backStream.end).toHaveBeenCalled();
        // ...and the back answers by ending the stream on its side.
        alice.backStream.emit("end");

        expect(await nbSockets()).toBe(1);
        expect(await nbClientsInRoom()).toBe(1);

        socketManager.cleanupSocket(bob.socket);
        bob.backStream.emit("end");

        expect(await nbSockets()).toBe(0);
        expect(await nbClientsInRoom()).toBe(0);
    });

    it("does not count a leave for a socket that closes before joining the room", async () => {
        const { socket, backStream } = await connect("carol");

        socketManager.cleanupSocket(socket);
        backStream.emit("end");

        expect(await nbSockets()).toBe(0);
    });
});
