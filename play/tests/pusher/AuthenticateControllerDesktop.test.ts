import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Application, Request, Response } from "express";

const mocks = vi.hoisted(() => ({
    exchangeDesktopOidcTransaction: vi.fn(),
    createDesktopAuthCode: vi.fn(),
    getUserInfo: vi.fn(),
}));

vi.mock("../../src/pusher/services/DesktopOidcTransactionService", () => ({
    desktopOidcTransactionService: { exchangeDesktopOidcTransaction: mocks.exchangeDesktopOidcTransaction },
}));
vi.mock("../../src/pusher/services/DesktopAuthService", () => ({
    desktopAuthService: { createDesktopAuthCode: mocks.createDesktopAuthCode },
}));
vi.mock("../../src/pusher/services/OpenIDClient", () => ({
    openIDClient: { getUserInfo: mocks.getUserInfo },
}));
vi.mock("../../src/pusher/services/JWTTokenManager", () => ({
    jwtTokenManager: { createAuthToken: vi.fn().mockResolvedValue("wa-token") },
}));
vi.mock("../../src/pusher/enums/EnvironmentVariable", () => import("./mocks/pusherEnvironmentVariableMock"));

import { AuthenticateController } from "../../src/pusher/controllers/AuthenticateController";

type Handler = (req: Request, res: Response) => Promise<void>;

const LOOPBACK = "http://127.0.0.1:4242/auth/callback/" + "a".repeat(64) + "?state=desktop-state";

function setup() {
    const routes = new Map<string, Handler>();
    const app = {
        get: (path: string, handler: Handler) => routes.set(path, handler),
        post: () => undefined,
        options: () => undefined,
    } as unknown as Application;
    new AuthenticateController(app);
    const callback = routes.get("/openid-callback");
    if (!callback) throw new Error("no /openid-callback route");
    return callback;
}

function fakeResponse() {
    const res = {
        statusCode: 200,
        redirectedTo: undefined as string | undefined,
        status(code: number) {
            res.statusCode = code;
            return res;
        },
        type: () => res,
        send: () => res,
        redirect(url: string) {
            res.redirectedTo = url;
        },
        cookie: () => res,
        clearCookie: () => res,
    };
    return res;
}

describe("AuthenticateController desktop /openid-callback", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mocks.exchangeDesktopOidcTransaction.mockResolvedValue({
            playUri: "https://play.example.com/_/global/map.json",
            codeVerifier: "verifier",
            callbackUrl: LOOPBACK,
            desktop: true,
        });
        mocks.getUserInfo.mockResolvedValue({ email: "user@example.com" });
        mocks.createDesktopAuthCode.mockResolvedValue("desktop-code");
    });

    it("rejects a callback replayed in a browser that did not start the login", async () => {
        const res = fakeResponse();
        await setup()(
            { query: { state: "S" }, cookies: { oidc_state: "other" } } as unknown as Request,
            res as unknown as Response,
        );

        expect(res.statusCode).toBe(400);
        expect(mocks.getUserInfo).not.toHaveBeenCalled();
        expect(mocks.createDesktopAuthCode).not.toHaveBeenCalled();
    });

    it("hands the code to the app's loopback when the state matches the browser cookie", async () => {
        const res = fakeResponse();
        await setup()(
            { query: { state: "S" }, cookies: { oidc_state: "S" } } as unknown as Request,
            res as unknown as Response,
        );

        const redirect = new URL(res.redirectedTo ?? "");
        expect(redirect.origin).toBe("http://127.0.0.1:4242");
        expect(redirect.searchParams.get("code")).toBe("desktop-code");
        expect(redirect.searchParams.get("state")).toBe("desktop-state");
    });

    it("never sends a desktop code to a workadventure:// deep link", async () => {
        mocks.exchangeDesktopOidcTransaction.mockResolvedValue(undefined);
        const res = fakeResponse();
        await setup()(
            {
                query: { state: "S" },
                cookies: { oidc_state: "S", desktopAuth: "true", playUri: "https://play.example.com/" },
            } as unknown as Request,
            res as unknown as Response,
        );

        expect(res.statusCode).toBe(400);
        expect(res.redirectedTo).toBeUndefined();
        expect(mocks.createDesktopAuthCode).not.toHaveBeenCalled();
    });
});
