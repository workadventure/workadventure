// @vitest-environment node
import { describe, expect, it, vi } from "vitest";

vi.mock("../../src/pusher/enums/EnvironmentVariable", async () => ({
    ...(await import("./mocks/pusherEnvironmentVariableMock")),
}));

const { openIDClient } = await import("../../src/pusher/services/OpenIDClient");

/**
 * openid-client throws an OPError carrying the OAuth2 error code. We only need the shape the client inspects.
 */
function expiredTokenError() {
    return Object.assign(new Error("invalid_token"), { error: "invalid_token" });
}

/**
 * Replaces the lazily discovered OpenID client with a stub. initClient is private, hence the cast.
 */
function stubClient(client: unknown) {
    return vi
        .spyOn(openIDClient as unknown as { initClient: () => Promise<unknown> }, "initClient")
        .mockResolvedValue(client);
}

describe("openIDClient.checkTokenAuthWithRefresh", () => {
    it("returns the user info without refreshing while the access token is accepted", async () => {
        const refresh = vi.fn();
        stubClient({ userinfo: vi.fn().mockResolvedValue({ sub: "user-1" }), refresh });

        const result = await openIDClient.checkTokenAuthWithRefresh("access-1", "encrypted-refresh");

        expect(result.refreshed).toBe(false);
        expect(result.accessToken).toBe("access-1");
        expect(result.encryptedRefreshToken).toBe("encrypted-refresh");
        expect(result.userInfo).toEqual({ sub: "user-1" });
        expect(refresh).not.toHaveBeenCalled();
    });

    it("refreshes the access token when the provider rejects the expired one", async () => {
        const encryptedRefreshToken = (openIDClient as unknown as { encrypt: (t: string) => string }).encrypt(
            "refresh-1",
        );

        const userinfo = vi.fn().mockRejectedValueOnce(expiredTokenError()).mockResolvedValueOnce({ sub: "user-1" });
        const refresh = vi.fn().mockResolvedValue({ access_token: "access-2" });
        stubClient({ userinfo, refresh });

        const result = await openIDClient.checkTokenAuthWithRefresh("access-1", encryptedRefreshToken);

        expect(refresh).toHaveBeenCalledWith("refresh-1");
        expect(result.refreshed).toBe(true);
        expect(result.accessToken).toBe("access-2");
        expect(result.userInfo).toEqual({ sub: "user-1" });
        expect(result.encryptedRefreshToken).toBe(encryptedRefreshToken);
    });

    it("stores the rotated refresh token when the provider issues a new one", async () => {
        const encryptedRefreshToken = (openIDClient as unknown as { encrypt: (t: string) => string }).encrypt(
            "refresh-1",
        );

        stubClient({
            userinfo: vi.fn().mockRejectedValueOnce(expiredTokenError()).mockResolvedValueOnce({ sub: "user-1" }),
            refresh: vi.fn().mockResolvedValue({ access_token: "access-2", refresh_token: "refresh-2" }),
        });

        const result = await openIDClient.checkTokenAuthWithRefresh("access-1", encryptedRefreshToken);

        expect(result.encryptedRefreshToken).not.toBe(encryptedRefreshToken);
        const decrypt = (openIDClient as unknown as { decrypt: (t: string) => string }).decrypt;
        expect(decrypt.call(openIDClient, result.encryptedRefreshToken as string)).toBe("refresh-2");
    });

    it("does not encrypt the refresh token in a way the browser could read", () => {
        const encrypted = (openIDClient as unknown as { encrypt: (t: string) => string }).encrypt("refresh-1");

        expect(encrypted).not.toContain("refresh-1");
        expect(Buffer.from(encrypted, "base64").toString("utf8")).not.toContain("refresh-1");
    });

    it("rethrows when there is no refresh token to fall back on", async () => {
        const refresh = vi.fn();
        stubClient({ userinfo: vi.fn().mockRejectedValue(expiredTokenError()), refresh });

        await expect(openIDClient.checkTokenAuthWithRefresh("access-1", undefined)).rejects.toThrow("invalid_token");
        expect(refresh).not.toHaveBeenCalled();
    });

    it("does not attempt a refresh when the failure is not about the token", async () => {
        const refresh = vi.fn();
        stubClient({ userinfo: vi.fn().mockRejectedValue(new Error("ECONNREFUSED")), refresh });

        await expect(openIDClient.checkTokenAuthWithRefresh("access-1", "encrypted-refresh")).rejects.toThrow(
            "ECONNREFUSED",
        );
        expect(refresh).not.toHaveBeenCalled();
    });

    it("fails when the refresh succeeds but yields no access token", async () => {
        const encryptedRefreshToken = (openIDClient as unknown as { encrypt: (t: string) => string }).encrypt(
            "refresh-1",
        );

        stubClient({
            userinfo: vi.fn().mockRejectedValue(expiredTokenError()),
            refresh: vi.fn().mockResolvedValue({}),
        });

        await expect(openIDClient.checkTokenAuthWithRefresh("access-1", encryptedRefreshToken)).rejects.toThrow(
            "returned no access token",
        );
    });
});
