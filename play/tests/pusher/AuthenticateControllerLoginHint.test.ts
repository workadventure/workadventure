import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Application, Request, Response } from "express";

const mocks = vi.hoisted(() => ({
    authorizationUrl: vi.fn(),
}));

vi.mock("../../src/pusher/services/OpenIDClient", () => ({
    openIDClient: { authorizationUrl: mocks.authorizationUrl },
}));
vi.mock("../../src/pusher/services/AdminService", () => ({
    adminService: { getCapabilities: vi.fn().mockResolvedValue({}) },
}));
vi.mock("../../src/pusher/services/verifyDomain/VerifyDomainService", () => ({
    VerifyDomainService: { get: () => ({ verifyDomain: vi.fn().mockResolvedValue(true) }) },
}));
vi.mock("../../src/pusher/enums/EnvironmentVariable", () => import("./mocks/pusherEnvironmentVariableMock"));

import { AuthenticateController } from "../../src/pusher/controllers/AuthenticateController";

type Handler = (req: Request, res: Response) => Promise<void>;

function loginScreen(): Handler {
    const routes = new Map<string, Handler>();
    const app = {
        get: (path: string, handler: Handler) => routes.set(path, handler),
        post: () => undefined,
        options: () => undefined,
    } as unknown as Application;
    new AuthenticateController(app);
    const handler = routes.get("/login-screen");
    if (!handler) throw new Error("no /login-screen route");
    return handler;
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
        json: () => res,
        redirect(url: string) {
            res.redirectedTo = url;
        },
        cookie: () => res,
        clearCookie: () => res,
    };
    return res;
}

describe("AuthenticateController /login-screen login_hint", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mocks.authorizationUrl.mockResolvedValue({ loginUri: "https://idp.example.com/authorize", state: "S" });
    });

    it("passes the email the user already typed to the identity provider", async () => {
        const res = fakeResponse();
        await loginScreen()(
            {
                query: { playUri: "https://play.example.com/@/acme/hq/lobby", login_hint: "ana@acme.com" },
            } as unknown as Request,
            res as unknown as Response,
        );
        expect(res.redirectedTo).toBe("https://idp.example.com/authorize");
        expect(mocks.authorizationUrl.mock.calls[0][7]).toBe("ana@acme.com");
    });

    it("sends no hint when there is none", async () => {
        const res = fakeResponse();
        await loginScreen()(
            { query: { playUri: "https://play.example.com/@/acme/hq/lobby" } } as unknown as Request,
            res as unknown as Response,
        );
        expect(res.redirectedTo).toBe("https://idp.example.com/authorize");
        expect(mocks.authorizationUrl.mock.calls[0][7]).toBeUndefined();
    });
});
