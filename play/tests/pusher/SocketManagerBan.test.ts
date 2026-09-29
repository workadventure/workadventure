import { afterEach, describe, expect, it, vi } from "vitest";
import { mock } from "vitest-mock-extended";
import type { WorldUser } from "@workadventure/messages";

vi.mock("../../src/pusher/enums/EnvironmentVariable", () => import("./mocks/pusherEnvironmentVariableMock"));

const backs = vi.hoisted(() => ({ answers: [] as (WorldUser[] | Error)[] }));
const banUserByUuid = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
vi.mock("../../src/pusher/services/ApiClientRepository", () => ({
    apiClientRepository: {
        getAllClients: () =>
            Promise.resolve(
                backs.answers.map((answer) => ({
                    getWorldUsers: (
                        query: unknown,
                        metadata: unknown,
                        options: unknown,
                        callback: (error: Error | null, answer?: { users: WorldUser[] }) => void,
                    ) => (answer instanceof Error ? callback(answer) : callback(null, { users: answer })),
                })),
            ),
        getClient: () => Promise.resolve({ ban: vi.fn() }),
    },
}));
vi.mock("../../src/pusher/services/AdminService", () => ({
    adminService: { banUserByUuid },
}));

import { SocketManager } from "../../src/pusher/services/SocketManager";
import type { PusherWebSocket } from "../../src/pusher/services/PusherWebSocket";

const ROOM = "https://play.test/@/org/world/room";
const worldUser = (uuid: string, ipAddress: string, roomUrl = ROOM): WorldUser => ({
    uuid,
    name: uuid,
    ipAddress,
    roomUrl,
});

const ban = () =>
    new SocketManager().handleBanPlayerMessage(
        mock<PusherWebSocket>({
            getUserData: vi.fn().mockReturnValue({
                tags: ["admin"],
                roomId: ROOM,
                userUuid: "moderator",
                ipAddress: "10.0.0.1",
            }),
        }),
        { banUserUuid: "troll", banUserName: "Troll", kick: false, reason: "" },
    );

const bannedIp = (): unknown => banUserByUuid.mock.calls[0][5];

describe("SocketManager.handleBanPlayerMessage", () => {
    afterEach(() => {
        vi.clearAllMocks();
        backs.answers = [];
    });

    it("bans the IP the back sees for the user, whatever back serves their room", async () => {
        backs.answers = [[worldUser("someone", "10.0.0.9")], [worldUser("troll", "203.0.113.42", `${ROOM}-2`)]];
        await ban();
        expect(bannedIp()).toBe("203.0.113.42");
    });

    it("bans the account only when the moderator shares the IP", async () => {
        backs.answers = [[worldUser("troll", "10.0.0.1")]];
        await ban();
        expect(bannedIp()).toBeUndefined();
    });

    it("bans the account only when a back does not answer", async () => {
        backs.answers = [[worldUser("troll", "203.0.113.42")], new Error("deadline exceeded")];
        await ban();
        expect(bannedIp()).toBeUndefined();
    });

    it("bans the account only when the user already left", async () => {
        backs.answers = [[worldUser("someone", "203.0.113.42")]];
        await ban();
        expect(bannedIp()).toBeUndefined();
    });
});
