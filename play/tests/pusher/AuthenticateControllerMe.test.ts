// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import type { Application, Request, Response } from "express";

vi.mock("../../src/pusher/enums/EnvironmentVariable", async () => ({
    ...(await import("./mocks/pusherEnvironmentVariableMock")),
}));

const { fetchMemberDataByUuid, checkTokenAuthWithRefresh } = vi.hoisted(() => ({
    fetchMemberDataByUuid: vi.fn(),
    checkTokenAuthWithRefresh: vi.fn(),
}));
vi.mock("../../src/pusher/services/AdminService", () => ({ adminService: { fetchMemberDataByUuid } }));
vi.mock("../../src/pusher/services/OpenIDClient", () => ({ openIDClient: { checkTokenAuthWithRefresh } }));

const { AuthenticateController } = await import("../../src/pusher/controllers/AuthenticateController");
const { jwtTokenManager } = await import("../../src/pusher/services/JWTTokenManager");

describe("/me", () => {
    it("renews the access token before asking the admin, and drops the tags the provider no longer grants", async () => {
        const routes = new Map<string, (req: Request, res: Response) => Promise<void>>();
        const app = {
            get: (path: string, handler: never) => routes.set(path, handler),
            post: vi.fn(),
            options: vi.fn(),
        };
        new AuthenticateController(app as unknown as Application);

        const staleToken = await jwtTokenManager.createAuthToken(
            "john@example.com",
            "expired-access",
            "John",
            "en-US",
            ["admin"],
            undefined,
            "encrypted-refresh-1",
        );
        checkTokenAuthWithRefresh.mockResolvedValue({
            userInfo: { sub: "1" },
            claims: { username: "John", locale: "en-US", tags: ["member"] },
            accessToken: "renewed-access",
            encryptedRefreshToken: "encrypted-refresh-2",
            refreshed: true,
        });
        fetchMemberDataByUuid.mockResolvedValue({ status: "ok" });

        const json = vi.fn();
        await routes.get("/me")?.(
            {
                query: { token: staleToken, playUri: "http://play.test/_/global/map.json" },
                header: () => undefined,
            } as never,
            { json, status: vi.fn(), send: vi.fn() } as never,
        );

        expect(checkTokenAuthWithRefresh).toHaveBeenCalledWith("expired-access", "encrypted-refresh-1");
        const adminArgs = fetchMemberDataByUuid.mock.calls[0];
        expect(adminArgs[1]).toBe("renewed-access");
        expect(adminArgs[7]).toEqual(["member"]);

        const authToken = json.mock.calls[0][0].authToken as string;
        const renewed = await jwtTokenManager.verifyJWTToken(authToken, false);
        expect(renewed.accessToken).toBe("renewed-access");
        expect(renewed.encryptedRefreshToken).toBe("encrypted-refresh-2");
        expect(renewed.tags).toEqual(["member"]);
    });
});
