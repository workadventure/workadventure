import axios from "axios";
import { afterEach, describe, expect, it, vi } from "vitest";
import { mock } from "vitest-mock-extended";

vi.mock("../../src/pusher/enums/EnvironmentVariable", () => import("./mocks/pusherEnvironmentVariableMock"));
vi.mock("../../src/pusher/services/ApiClientRepository", () => ({ apiClientRepository: {} }));

const getMember = vi.hoisted(() => vi.fn());
vi.mock("../../src/pusher/services/AdminService", () => ({ adminService: { getMember } }));

import { SocketManager } from "../../src/pusher/services/SocketManager";
import { adminApi } from "../../src/pusher/services/AdminApi";
import type { PusherWebSocket } from "../../src/pusher/services/PusherWebSocket";

const ROOM = "https://play.test/@/org/world/room";
const member = {
    id: "owner",
    name: "Owner",
    email: "owner@example.com",
    visitCardUrl: "https://admin.test/cards/owner",
    chatID: "@owner:matrix.test",
};

const player = (userData: { roomId: string; canEdit: boolean }) =>
    mock<PusherWebSocket>({ getUserData: vi.fn().mockReturnValue(userData) });

const query = (roomId: string, canEdit = false) =>
    new SocketManager().handleGetMemberQuery(player({ roomId, canEdit }), { uuid: "owner" });

describe("SocketManager.handleGetMemberQuery", () => {
    afterEach(() => {
        vi.clearAllMocks();
    });

    it("asks the admin for the member within the room of the player", async () => {
        getMember.mockResolvedValue(member);
        const answer = await query(ROOM);
        expect(getMember).toHaveBeenCalledWith(ROOM, "owner");
        expect(answer?.member).toMatchObject({ visitCardUrl: member.visitCardUrl, chatID: member.chatID });
    });

    it("relays the email to map editors only", async () => {
        getMember.mockResolvedValue(member);
        expect((await query(ROOM, false))?.member?.email).toBeUndefined();
        expect((await query(ROOM, true))?.member?.email).toBe("owner@example.com");
    });

    it("does not call the admin without the room of the player", async () => {
        expect(await query("")).toBeUndefined();
        expect(getMember).not.toHaveBeenCalled();
    });

    it("answers nothing when the admin does not find the member in this world", async () => {
        getMember.mockRejectedValue(new Error("404"));
        expect(await query(ROOM)).toBeUndefined();
    });
});

describe("AdminApi.getMember", () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    it("sends the room of the player and keeps the UUID inside the path segment", async () => {
        const get = vi.spyOn(axios, "get").mockResolvedValue({ data: member });
        await adminApi.getMember(ROOM, "../world/tags");
        expect(get.mock.calls[0][0]).toMatch(/\/api\/members\/\.\.%2Fworld%2Ftags$/);
        expect(get.mock.calls[0][1]).toMatchObject({ params: { playUri: ROOM } });
    });
});
