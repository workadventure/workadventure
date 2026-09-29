import axios from "axios";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("../../src/pusher/enums/EnvironmentVariable", () => import("./mocks/pusherEnvironmentVariableMock"));

import { adminApi } from "../../src/pusher/services/AdminApi";

const ban = () =>
    adminApi.banUserByUuid("target-uuid", "http://play.test/@/team/world/room", "Target", "", "admin-uuid");

describe("AdminApi.banUserByUuid", () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    it("resolves when the admin recorded the ban", async () => {
        vi.spyOn(axios, "post").mockResolvedValue({ status: 200, data: { uuid_user: "target-uuid", is_banned: true } });
        await expect(ban()).resolves.toBe(true);
    });

    it("rejects when the admin answers a refused ban with a 200 and an error body", async () => {
        vi.spyOn(axios, "post").mockResolvedValue({
            status: 200,
            data: { status: "error", type: "unauthorized", code: "USER_ACCESS_FORBIDDEN", title: "Forbidden" },
        });
        await expect(ban()).rejects.toThrow("USER_ACCESS_FORBIDDEN");
    });
});
