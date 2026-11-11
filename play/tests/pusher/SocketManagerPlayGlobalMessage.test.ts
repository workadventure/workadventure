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

import { SocketManager, sameOriginJoinUrl } from "../../src/pusher/services/SocketManager";
import type { PusherWebSocket } from "../../src/pusher/services/PusherWebSocket";

const ROOM = "https://play.test/~/office.wam";

const admin = () =>
    mock<PusherWebSocket>({
        getUserData: vi.fn().mockReturnValue({
            tags: ["admin"],
            roomId: ROOM,
            name: "Claire",
            characterTextures: [{ id: "body1", url: "body1.png" }],
        }),
    });

const sendToWorld = () =>
    new SocketManager().emitPlayGlobalMessage(admin(), {
        content: "hello world",
        type: "message",
        broadcastToWorld: true,
        joinUrl: "",
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
            joinUrl: "/~/office.wam#moveTo=Auditorium",
        });

        expect(getUrlRoomsFromSameWorld).not.toHaveBeenCalled();
        expect(sent.messages.map((message) => message.roomId)).toEqual([ROOM]);
        expect(sent.messages[0]).toMatchObject({
            senderName: "Claire",
            senderTextures: [{ id: "body1", url: "body1.png" }],
            broadcastToWorld: false,
            joinUrl: "https://play.test/~/office.wam#moveTo=Auditorium",
        });
    });

    it("only keeps places on the sender's origin", () => {
        expect(sameOriginJoinUrl("https://play.test/~/hall.wam#moveTo=A", ROOM)).toBe(
            "https://play.test/~/hall.wam#moveTo=A",
        );
        expect(sameOriginJoinUrl("https://evil.test/~/hall.wam", ROOM)).toBe("");
        expect(sameOriginJoinUrl("javascript:alert(1)", ROOM)).toBe("");
        expect(sameOriginJoinUrl("", ROOM)).toBe("");
    });
});
