import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("OIDC redirect URLs", () => {
    beforeEach(() => {
        vi.resetModules();
    });

    afterEach(() => {
        vi.doUnmock("../../src/pusher/enums/EnvironmentVariableValidator");
    });

    it.each([
        ["https://example.com", "https://example.com"],
        ["https://example.com/", "https://example.com"],
        ["https://example.com/pusher", "https://example.com/pusher"],
        ["https://example.com/pusher/", "https://example.com/pusher"],
        ["/pusher", "/pusher"],
        ["/pusher/", "/pusher"],
        ["", ""],
        [undefined, ""],
    ])("should build callback URLs when PUSHER_URL is %s", async (pusherUrl, expectedBaseUrl) => {
        vi.doMock("../../src/pusher/enums/EnvironmentVariableValidator", () => ({
            EnvironmentVariables: {
                safeParse: () => ({
                    success: true,
                    data: { PUSHER_URL: pusherUrl },
                }),
            },
        }));

        const { OPID_CLIENT_REDIRECT_LOGOUT_URL, OPID_CLIENT_REDIRECT_URL } =
            await import("../../src/pusher/enums/EnvironmentVariable");

        expect(OPID_CLIENT_REDIRECT_URL).toBe(`${expectedBaseUrl}/openid-callback`);
        expect(OPID_CLIENT_REDIRECT_LOGOUT_URL).toBe(`${expectedBaseUrl}/logout-callback`);
    });
});

describe("Matrix API URI", () => {
    beforeEach(() => {
        vi.resetModules();
    });

    afterEach(() => {
        vi.doUnmock("../../src/pusher/enums/EnvironmentVariableValidator");
    });

    it.each([
        ["http://synapse:8008", "http://synapse:8008/"],
        ["http://synapse:8008/", "http://synapse:8008/"],
        ["https://matrix.example.com/internal", "https://matrix.example.com/internal/"],
        ["https://matrix.example.com/internal///", "https://matrix.example.com/internal/"],
        ["", ""],
        [undefined, undefined],
    ])("should normalize MATRIX_API_URI when it is %s", async (matrixApiUri, expectedMatrixApiUri) => {
        vi.doMock("../../src/pusher/enums/EnvironmentVariableValidator", () => ({
            EnvironmentVariables: {
                safeParse: () => ({
                    success: true,
                    data: { MATRIX_API_URI: matrixApiUri },
                }),
            },
        }));

        const { MATRIX_API_URI } = await import("../../src/pusher/enums/EnvironmentVariable");

        expect(MATRIX_API_URI).toBe(expectedMatrixApiUri);
    });
});
