import axios from "axios";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("../../src/pusher/enums/EnvironmentVariable", () => import("./mocks/pusherEnvironmentVariableMock"));

import { adminApi } from "../../src/pusher/services/AdminApi";

const ban = (ipAddress?: string) =>
    adminApi.banUserByUuid("target-uuid", "http://play.test/@/team/world/room", "Target", "", "admin-uuid", ipAddress);

describe("AdminApi.banUserByUuid", () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    it("resolves when the admin recorded the ban", async () => {
        vi.spyOn(axios, "post").mockResolvedValue({ status: 200, data: { uuid_user: "target-uuid", is_banned: true } });
        await expect(ban()).resolves.toBeUndefined();
    });

    it("sends the IP of the user when it must be banned too", async () => {
        const post = vi.spyOn(axios, "post").mockResolvedValue({ status: 201, data: {} });
        await ban("203.0.113.42");
        expect(post.mock.calls[0][1]).toMatchObject({ uuidToBan: "target-uuid", ipAddress: "203.0.113.42" });
    });

    it("rejects when the admin answers a refused ban with a 200 and an error body", async () => {
        vi.spyOn(axios, "post").mockResolvedValue({
            status: 200,
            data: { status: "error", type: "unauthorized", code: "USER_ACCESS_FORBIDDEN", title: "Forbidden" },
        });
        await expect(ban()).rejects.toThrow("USER_ACCESS_FORBIDDEN");
    });
});
