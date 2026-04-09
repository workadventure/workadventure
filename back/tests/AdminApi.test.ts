import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@sentry/node", () => ({
    captureException: vi.fn(),
}));

describe("AdminApi", () => {
    const fetchMock = vi.fn<typeof fetch>();

    beforeEach(() => {
        vi.stubGlobal("fetch", fetchMock);
    });

    afterEach(() => {
        vi.clearAllMocks();
        vi.unstubAllGlobals();
    });

    it("should parse livekit credentials from a successful response", async () => {
        const { AdminApi } = await import("../src/Services/AdminApi");
        const adminApi = new AdminApi("https://admin.example.com/", "secret-token");

        fetchMock.mockResolvedValue(
            new Response(
                JSON.stringify({
                    livekitHost: "https://livekit.example.com",
                    livekitApiKey: "api-key",
                    livekitApiSecret: "api-secret",
                }),
                {
                    status: 200,
                    headers: {
                        "content-type": "application/json",
                    },
                }
            )
        );

        await expect(adminApi.fetchLivekitCredentials("space-id", "https://play.example.com/room")).resolves.toEqual({
            livekitHost: "https://livekit.example.com",
            livekitApiKey: "api-key",
            livekitApiSecret: "api-secret",
        });

        expect(fetchMock).toHaveBeenCalledTimes(1);
        expect(fetchMock.mock.calls[0]?.[0]).toBeInstanceOf(URL);
        expect((fetchMock.mock.calls[0]?.[0] as URL).href).toBe(
            "https://admin.example.com/api/livekit/credentials?playUri=https%3A%2F%2Fplay.example.com%2Froom"
        );
        expect(fetchMock.mock.calls[0]?.[1]).toEqual(
            expect.objectContaining({
                headers: {
                    Authorization: "secret-token",
                    Accept: "application/json",
                },
            })
        );
    });

    it("should reject livekit credentials requests with an HttpError on non-2xx responses", async () => {
        const { AdminApi } = await import("../src/Services/AdminApi");
        const { HttpError } = await import("@workadventure/shared-utils");
        const adminApi = new AdminApi("https://admin.example.com/", "secret-token");

        fetchMock.mockResolvedValue(
            new Response(JSON.stringify({ error: "forbidden" }), {
                status: 403,
                statusText: "Forbidden",
                headers: {
                    "content-type": "application/json",
                },
            })
        );

        await expect(
            adminApi.fetchLivekitCredentials("space-id", "https://play.example.com/room")
        ).rejects.toBeInstanceOf(HttpError);
    });

    it("should return map details for a valid admin response", async () => {
        const { AdminApi } = await import("../src/Services/AdminApi");
        const adminApi = new AdminApi("https://admin.example.com/", "secret-token");

        fetchMock.mockResolvedValue(
            new Response(
                JSON.stringify({
                    mapUrl: "https://maps.example.com/world.tmj",
                    editable: false,
                    authenticationMandatory: null,
                    group: null,
                    showPoweredBy: true,
                    enableChat: true,
                    enableChatUpload: true,
                }),
                {
                    status: 200,
                    headers: {
                        "content-type": "application/json",
                    },
                }
            )
        );

        await expect(adminApi.fetchMapDetails("https://play.example.com/room")).resolves.toEqual({
            mapUrl: "https://maps.example.com/world.tmj",
            editable: false,
            authenticationMandatory: null,
            group: null,
            showPoweredBy: true,
            enableChat: true,
            enableChatUpload: true,
        });
    });

    it("should return a validation error when /api/map returns an invalid payload", async () => {
        const { AdminApi } = await import("../src/Services/AdminApi");
        const adminApi = new AdminApi("https://admin.example.com/", "secret-token");

        fetchMock.mockResolvedValue(
            new Response(JSON.stringify({ unexpected: true }), {
                status: 200,
                headers: {
                    "content-type": "application/json",
                },
            })
        );

        await expect(adminApi.fetchMapDetails("https://play.example.com/room")).resolves.toEqual(
            expect.objectContaining({
                status: "error",
                code: "MAP_VALIDATION",
            })
        );
    });

    it("should return a connection error when /api/map returns a non-2xx status", async () => {
        const { AdminApi } = await import("../src/Services/AdminApi");
        const adminApi = new AdminApi("https://admin.example.com/", "secret-token");

        fetchMock.mockResolvedValue(
            new Response("Gateway timeout", {
                status: 504,
                statusText: "Gateway Timeout",
            })
        );

        await expect(adminApi.fetchMapDetails("https://play.example.com/room")).resolves.toEqual(
            expect.objectContaining({
                status: "error",
                code: "ROOM_ACCESS_ERROR",
                details: "Request failed with status 504 Gateway Timeout",
            })
        );
    });

    it("should return a connection error when /api/map fetch throws", async () => {
        const { AdminApi } = await import("../src/Services/AdminApi");
        const adminApi = new AdminApi("https://admin.example.com/", "secret-token");

        fetchMock.mockRejectedValue(new Error("socket hang up"));

        await expect(adminApi.fetchMapDetails("https://play.example.com/room")).resolves.toEqual(
            expect.objectContaining({
                status: "error",
                code: "ROOM_ACCESS_ERROR",
                details: "socket hang up",
            })
        );
    });
});
