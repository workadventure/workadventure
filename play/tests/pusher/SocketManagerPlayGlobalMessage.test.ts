import { afterEach, describe, expect, it, vi } from "vitest";
import { mock } from "vitest-mock-extended";
import type { AdminRoomMessage } from "@workadventure/messages";

vi.mock("../../src/pusher/enums/EnvironmentVariable", () => import("./mocks/pusherEnvironmentVariableMock"));

const sent = vi.hoisted(() => ({ messages: [] as AdminRoomMessage[] }));
const getUrlRoomsFromSameWorld = vi.hoisted(() => vi.fn());
vi.mock("../../src/pusher/services/ApiClientRepository", () => ({
    apiClientRepository: {
        getClient: () =>
            Promise.resolve({
                sendAdminMessageToRoom: (message: AdminRoomMessage) => {
                    sent.messages.push(message);
                },
            }),
    },
}));
vi.mock("../../src/pusher/services/AdminService", () => ({
    adminService: { getUrlRoomsFromSameWorld },
}));

import { SocketManager } from "../../src/pusher/services/SocketManager";
import type { PusherWebSocket } from "../../src/pusher/services/PusherWebSocket";

const ROOM = "https://play.test/~/office.wam";

const admin = () =>
    mock<PusherWebSocket>({
        getUserData: vi.fn().mockReturnValue({ tags: ["admin"], roomId: ROOM }),
    });

const sendToWorld = () =>
    new SocketManager().emitPlayGlobalMessage(admin(), {
        content: "/download-audio-message/abc",
        type: "audio",
        broadcastToWorld: true,
    });

describe("SocketManager.emitPlayGlobalMessage", () => {
    afterEach(() => {
        vi.clearAllMocks();
        sent.messages = [];
    });

    it("sends a world broadcast to the absolute URL of rooms listed as relative paths", async () => {
        // LocalAdmin (no admin API) lists map-storage rooms as "/~/<path>".
        getUrlRoomsFromSameWorld.mockResolvedValue([
            { name: "office", roomUrl: "/~/office.wam" },
            { name: "lobby", roomUrl: "/~/lobby.wam" },
        ]);

        await sendToWorld();

        expect(sent.messages.map((message) => message.roomId)).toEqual([
            "https://play.test/~/office.wam",
            "https://play.test/~/lobby.wam",
        ]);
    });

    it("keeps absolute room URLs from an admin API unchanged", async () => {
        getUrlRoomsFromSameWorld.mockResolvedValue([
            { name: "room2", roomUrl: "https://play.test/@/team/world/room2" },
        ]);

        await sendToWorld();

        expect(sent.messages.map((message) => message.roomId)).toEqual(["https://play.test/@/team/world/room2"]);
    });

    it("sends a room message to the sender's room", async () => {
        await new SocketManager().emitPlayGlobalMessage(admin(), {
            content: "hello",
            type: "message",
            broadcastToWorld: false,
        });

        expect(getUrlRoomsFromSameWorld).not.toHaveBeenCalled();
        expect(sent.messages.map((message) => message.roomId)).toEqual([ROOM]);
    });
});
