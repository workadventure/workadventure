import { describe, expect, it, vi } from "vitest";

const captureException = vi.hoisted(() => vi.fn());
vi.mock("@sentry/node", async (importOriginal) => ({
    ...(await importOriginal<Record<string, unknown>>()),
    captureException,
}));
vi.mock("../src/Enum/EnvironmentVariable", async (importOriginal) => ({
    ...(await importOriginal<Record<string, unknown>>()),
    ADMIN_API_URL: "http://admin.test/",
}));

const { GameRoom } = await import("../src/Model/GameRoom");
const { RoomNotResolvedError } = await import("../src/Model/Errors");
const { adminApi } = await import("../src/Services/AdminApi");

describe("GameRoom.create with an admin", () => {
    it("rejects a room the admin redirects with a RoomNotResolvedError, without reporting it itself", async () => {
        vi.spyOn(adminApi, "fetchMapDetails").mockResolvedValue({
            redirectUrl: "https://play.test/@/team/world/room",
        });
        const noop = () => {};

        await expect(
            GameRoom.create(
                "https://play.test/@/team/world/room.wam",
                noop,
                noop,
                160,
                40,
                noop,
                noop,
                noop,
                noop,
                noop,
                noop,
                noop,
            ),
        ).rejects.toBeInstanceOf(RoomNotResolvedError);
        expect(captureException).not.toHaveBeenCalled();
    });
});
