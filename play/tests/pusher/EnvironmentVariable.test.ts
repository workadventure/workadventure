import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("OIDC redirect URLs", () => {
    beforeEach(() => {
        vi.resetModules();
    });

    afterEach(() => {
        vi.doUnmock("../../src/pusher/enums/EnvironmentVariableValidator");
    });

    it.each(["https://example.com", "https://example.com/"])(
        "should build callback URLs when PUSHER_URL is %s",
        async (pusherUrl) => {
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

            expect(OPID_CLIENT_REDIRECT_URL).toBe("https://example.com/openid-callback");
            expect(OPID_CLIENT_REDIRECT_LOGOUT_URL).toBe("https://example.com/logout-callback");
        },
    );
});
