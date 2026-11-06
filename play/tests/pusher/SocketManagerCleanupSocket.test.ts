import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("../../src/pusher/enums/EnvironmentVariable", () => import("./mocks/pusherEnvironmentVariableMock"));

import { socketManager } from "../../src/pusher/services/SocketManager";
import { analyticsTimedEventTracker } from "../../src/pusher/services/AnalyticsTimedEventTracker";
import { PusherWebSocket, type RawSocket } from "../../src/pusher/services/PusherWebSocket";
import type { SocketData } from "../../src/pusher/models/Websocket/SocketData";
import { WS_CLOSE_CODE_SESSION_DESTROYED } from "../../src/common/WebSocketCloseCodes";

function connect() {
    const backConnection = { write: vi.fn(), end: vi.fn() };
    const userData = {
        roomId: "https://play.test/@/org/world/room",
        userUuid: "user",
        tabId: "tab",
        spaces: new Set<string>(),
        currentChatRoomArea: [],
        backConnection,
    } as unknown as SocketData;
    const raw = { getUserData: () => userData, end: vi.fn(), ping: vi.fn() };
    return { client: new PusherWebSocket(raw as unknown as RawSocket), raw, backConnection };
}

describe("SocketManager.cleanupSocket", () => {
    // The singleton, not a new SocketManager: each instance registers its own gauge listeners.
    const manager = socketManager;

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it("cleans a socket up once when both the transport close and the back stream end trigger it", () => {
        const { client, backConnection } = connect();
        const leaveSpaces = vi.spyOn(manager, "leaveSpaces");
        const leaveChatRoomArea = vi.spyOn(manager, "leaveChatRoomArea");
        const closeConnection = vi.spyOn(analyticsTimedEventTracker, "closeConnection");

        // The client closes its WebSocket...
        manager.cleanupSocket(client);
        // ...then the back ends the stream we ended, and the "end" handler cleans up again.
        manager.cleanupSocket(client);
        client.end(WS_CLOSE_CODE_SESSION_DESTROYED, "Back lost");

        expect(backConnection.end).toHaveBeenCalledOnce();
        expect(leaveSpaces).toHaveBeenCalledOnce();
        expect(leaveChatRoomArea).toHaveBeenCalledOnce();
        expect(closeConnection).toHaveBeenCalledOnce();
    });

    it("still sends the close frame after a server-side cleanup", () => {
        const { client, raw } = connect();

        manager.cleanupSocket(client);
        client.end(WS_CLOSE_CODE_SESSION_DESTROYED, "Room no longer exists");

        expect(raw.end).toHaveBeenCalledWith(WS_CLOSE_CODE_SESSION_DESTROYED, "Room no longer exists");
    });
});
