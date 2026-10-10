// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { localUserStore } from "../../../../Connection/LocalUserStore";
import { exchangeMatrixLoginToken, InvalidLoginTokenError } from "../MatrixLoginTokenExchange";

function jsonResponse(status: number, body: unknown): Response {
    return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

describe("exchangeMatrixLoginToken", () => {
    const fetchMock = vi.fn<typeof fetch>();

    beforeEach(() => {
        localStorage.clear();
        fetchMock.mockReset();
        vi.stubGlobal("fetch", fetchMock);
    });

    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it("stores the session the homeserver returns", async () => {
        localUserStore.setMatrixUserId("@previous:example.org");
        fetchMock.mockResolvedValueOnce(
            jsonResponse(200, {
                user_id: "@alice:example.org",
                access_token: "accessToken",
                refresh_token: "refreshToken",
                expires_in_ms: 60_000,
                device_id: "DEVICE",
            }),
        );

        await exchangeMatrixLoginToken("https://matrix.example.org/", "loginToken");

        const [url, init] = fetchMock.mock.calls[0];
        expect(url).toBe("https://matrix.example.org/_matrix/client/v3/login");
        expect(JSON.parse(init?.body as string)).toEqual({
            type: "m.login.token",
            token: "loginToken",
            initial_device_display_name: "WorkAdventure",
        });
        expect(localUserStore.getMatrixUserId()).toBe("@alice:example.org");
        expect(localUserStore.getMatrixAccessToken()).toBe("accessToken");
        expect(localUserStore.getMatrixRefreshToken()).toBe("refreshToken");
        expect(localUserStore.getMatrixDeviceId("@alice:example.org")).toBe("DEVICE");
        expect(localUserStore.getMatrixAccessTokenExpireDate()).not.toBeNull();
        // Another Matrix user used this browser before: the chat must clear the stores before it connects.
        expect(localUserStore.getMatrixStoresNeedClearing()).toBe(true);
        expect(localStorage.getItem("matrixLoginToken")).toBeNull();
    });

    it("keeps the stores when the same Matrix user logs in again", async () => {
        localUserStore.setMatrixUserId("@alice:example.org");
        fetchMock.mockResolvedValueOnce(
            jsonResponse(200, { user_id: "@alice:example.org", access_token: "accessToken", device_id: "DEVICE" }),
        );

        await exchangeMatrixLoginToken("https://matrix.example.org", "loginToken");

        expect(localUserStore.getMatrixStoresNeedClearing()).toBe(false);
        expect(localUserStore.getMatrixRefreshToken()).toBeNull();
    });

    it("gives up at once when the homeserver refuses the token", async () => {
        fetchMock.mockResolvedValue(jsonResponse(403, { errcode: "M_FORBIDDEN", error: "Invalid login token" }));

        await expect(
            exchangeMatrixLoginToken("https://matrix.example.org", "loginToken", [0, 0]),
        ).rejects.toBeInstanceOf(InvalidLoginTokenError);

        expect(fetchMock).toHaveBeenCalledOnce();
        expect(localUserStore.getMatrixAccessToken()).toBeNull();
    });

    it("retries when the homeserver does not answer", async () => {
        fetchMock
            .mockRejectedValueOnce(new TypeError("Failed to fetch"))
            .mockResolvedValueOnce(jsonResponse(429, { errcode: "M_LIMIT_EXCEEDED" }))
            .mockResolvedValueOnce(
                jsonResponse(200, { user_id: "@alice:example.org", access_token: "accessToken", device_id: "DEVICE" }),
            );

        await exchangeMatrixLoginToken("https://matrix.example.org", "loginToken", [0, 0]);

        expect(fetchMock).toHaveBeenCalledTimes(3);
        expect(localUserStore.getMatrixAccessToken()).toBe("accessToken");
    });

    it("fails with the last error once the retries are spent", async () => {
        fetchMock.mockRejectedValue(new TypeError("Failed to fetch"));

        await expect(exchangeMatrixLoginToken("https://matrix.example.org", "loginToken", [0, 0])).rejects.toThrow(
            "Failed to fetch",
        );

        expect(fetchMock).toHaveBeenCalledTimes(3);
    });
});
