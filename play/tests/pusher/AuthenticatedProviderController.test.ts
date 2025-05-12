import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Request, Response, Application } from "express";
import { AuthenticatedProviderController } from "../../src/pusher/controllers/AuthenticatedProviderController";

const NOT_A_SECRET = "foo";
class MockAuthenticatedProviderController extends AuthenticatedProviderController<string> {
    promise = Promise.resolve("success");
    lastRequestParameters: string[] = [];
    protected getData(roomUrl: string, uuid: string): Promise<string | undefined> {
        this.lastRequestParameters = [roomUrl, uuid];
        return this.promise;
    }

    protected routes(): void {}
}

class MockApp {
    getRoutes: Map<string, (req: Request, res: Response) => void> = new Map<string, () => void>();
    options(_endpoint: string, _callback: unknown) {
        return;
    }
    get(endpoint: string, callback: (req: Request, res: Response) => void) {
        this.getRoutes.set(endpoint, callback);
        return;
    }
    simulateRequest(endpoint: string, req: Request, res: Response) {
        const endpointHandler = this.getRoutes.get(endpoint);
        endpointHandler?.call(endpointHandler, req, res);
    }
}

class FakeResponse {
    public lastJsonData: string | undefined;
    public lastSentData: string | undefined;
    public lastStatus: number | undefined;
    constructor(private expectedStatus: number) {}

    status(status: number) {
        this.lastStatus = status;
        if (status != this.expectedStatus) throw new Error(`Expected status ${this.expectedStatus}, got ${status}`);
        return this;
    }
    json(data: string) {
        this.lastJsonData = data;
    }
    send(data: string) {
        this.lastSentData = data;
    }
}

class FakeRequest {
    params: object = {};
    constructor(
        public query: { [key: string]: string } = {},
        private headers: { [key: string]: string } = { Authorization: NOT_A_SECRET }
    ) {}
    header(header: string): string {
        return this.headers[header];
    }
}

export interface MockAuthTokenData {
    identifier: string;
    accessToken?: string;
    username?: string;
    locale?: string;
}

export class JWTTokenManagerMock {
    public verifyAdminSocketToken(_token: string): { authorizedRoomIds: string[] } {
        return { authorizedRoomIds: [] };
    }

    public createAuthToken(identifier: string, _accessToken?: string, username?: string, _locale?: string): string {
        return "";
    }

    public verifyJWTToken(token: string, ignoreExpiration = false): MockAuthTokenData {
        return { identifier: "" };
    }
}

describe("AuthenticatedProviderController", () => {
    let mockApp: MockApp;
    let mockTokenManager: JWTTokenManagerMock;

    beforeEach(() => {
        mockApp = new MockApp();
        mockTokenManager = new JWTTokenManagerMock();
        vi.spyOn(mockApp, "options");
    });

    function isValidToken(): void {
        vi.spyOn(mockTokenManager, "verifyJWTToken").mockReturnValue({ identifier: "avaliduser" });
    }

    it("should setup correct routes and execute getData with given parameters", async () => {
        isValidToken();
        const subject = new MockAuthenticatedProviderController(mockApp as unknown as Application, mockTokenManager);

        subject.setupRoutes("/foo/bar");

        const req = new FakeRequest({
            roomUrl: "room",
        });
        const res = new FakeResponse(200);

        mockApp.simulateRequest("/foo/bar", req as unknown as Request, res as unknown as Response);
        await subject.promise;
        expect(res.lastJsonData).toEqual("success");
        expect(subject.lastRequestParameters).toEqual(["room", "avaliduser"]);
    });

    it("should fail if roomUrl is not given", () => {
        isValidToken();
        const subject = new MockAuthenticatedProviderController(mockApp as unknown as Application, mockTokenManager);

        subject.setupRoutes("/foo/bar");
        const req = new FakeRequest();
        const res = new FakeResponse(400);

        mockApp.simulateRequest("/foo/bar", req as unknown as Request, res as unknown as Response);
        expect(res.lastSentData).toEqual("bad roomUrl URL parameter");
    });

    it("should fail if Authorization header is not given", () => {
        isValidToken();
        const subject = new MockAuthenticatedProviderController(mockApp as unknown as Application, mockTokenManager);

        subject.setupRoutes("/foo/bar");
        const req = new FakeRequest(undefined, {});
        const res = new FakeResponse(401);

        mockApp.simulateRequest("/foo/bar", req as unknown as Request, res as unknown as Response);
        expect(res.lastSentData).toEqual("Undefined authorization header");
    });

    it("should fail if verifyJWTToken fails", () => {
        vi.spyOn(mockTokenManager, "verifyJWTToken").mockImplementation(() => {
            throw new Error("failed to verify token");
        });
        const subject = new MockAuthenticatedProviderController(mockApp as unknown as Application, mockTokenManager);

        subject.setupRoutes("/foo/bar");
        const req = new FakeRequest({
            roomUrl: "url",
        });
        const res = new FakeResponse(401);

        mockApp.simulateRequest("/foo/bar", req as unknown as Request, res as unknown as Response);
        expect(res.lastSentData).toEqual("Invalid token sent");
    });
});
