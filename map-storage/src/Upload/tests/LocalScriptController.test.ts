/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi } from "vitest";
import { Request, Response } from "express";

// Mock PLAY_URL and PUSHER_URL before importing LocalScriptController
vi.mock("../../Enum/EnvironmentVariable", () => ({
    PUSHER_URL: "http://pusher.workadventure.localhost",
    PLAY_URL: "http://play.workadventure.localhost",
}));

import { LocalScriptController } from "../LocalScriptController";

// Mock Express app
const createMockApp = (): any => {
    const routes: { [key: string]: (req: Request, res: Response, next: () => void) => void } = {};
    return {
        get: vi.fn((path: string, handler: (req: Request, res: Response, next: () => void) => void) => {
            routes[path] = handler;
        }),
        _routes: routes,
    };
};

// Mock Request and Response
const createMockRequest = (query: { [key: string]: string } = {}): Partial<Request> => ({
    query,
});

interface MockResponse extends Partial<Response> {
    _statusCode: number;
    _body: string;
    _headers: { [key: string]: string };
}

const createMockResponse = (): MockResponse => {
    const res: MockResponse = {
        status: vi.fn().mockReturnThis(),
        send: vi.fn().mockReturnThis(),
        setHeader: vi.fn().mockReturnThis(),
        _statusCode: 200,
        _body: "",
        _headers: {},
    };

    res.status = vi.fn((code: number) => {
        res._statusCode = code;
        return res as Response;
    });

    res.send = vi.fn((body: string) => {
        res._body = body;
        return res as Response;
    });

    res.setHeader = vi.fn((name: string, value: string) => {
        res._headers[name] = value;
        return res as Response;
    });

    return res;
};

describe("LocalScriptController", () => {
    it("should return HTML page with script from localhost", async () => {
        const mockApp = createMockApp();
        new LocalScriptController(mockApp);

        const scriptUrl = "http://localhost:3500/src/myscript.js";
        const req = createMockRequest({ script: scriptUrl });
        const res = createMockResponse();

        const handler = mockApp._routes["/local-script"];
        await handler(req, res, vi.fn());

        expect(res._statusCode).toBe(200);
        expect(res._headers["Content-Type"]).toContain("text/html");
        expect(res._body).toContain('<script src="');
        expect(res._body).toContain('/iframe_api.js"></script>');
        expect(res._body).toContain(`<script type="module" src="${scriptUrl}"></script>`);
        expect(res._body).toContain("<!DOCTYPE html>");
        expect(res._body).toContain("<html>");
        expect(res._body).toContain("</html>");
    });

    it("should return HTML page with script from subdomain.localhost", async () => {
        const mockApp = createMockApp();
        new LocalScriptController(mockApp);

        const scriptUrl = "http://dev.localhost:8080/scripts/test.js";
        const req = createMockRequest({ script: scriptUrl });
        const res = createMockResponse();

        const handler = mockApp._routes["/local-script"];
        await handler(req, res, vi.fn());

        expect(res._statusCode).toBe(200);
        expect(res._headers["Content-Type"]).toContain("text/html");
        expect(res._body).toContain(`<script type="module" src="${scriptUrl}"></script>`);
    });

    it("should return 400 for script URL from non-localhost domain", async () => {
        const mockApp = createMockApp();
        new LocalScriptController(mockApp);

        const scriptUrl = "http://example.com/malicious.js";
        const req = createMockRequest({ script: scriptUrl });
        const res = createMockResponse();

        const handler = mockApp._routes["/local-script"];
        await handler(req, res, vi.fn());

        expect(res._statusCode).toBe(400);
        expect(res._body).toContain("localhost");
    });

    it("should return 400 for script URL from external domain", async () => {
        const mockApp = createMockApp();
        new LocalScriptController(mockApp);

        const scriptUrl = "https://evil.com/script.js";
        const req = createMockRequest({ script: scriptUrl });
        const res = createMockResponse();

        const handler = mockApp._routes["/local-script"];
        await handler(req, res, vi.fn());

        expect(res._statusCode).toBe(400);
        expect(res._body).toContain("localhost");
    });

    it("should return 400 for missing script parameter", async () => {
        const mockApp = createMockApp();
        new LocalScriptController(mockApp);

        const req = createMockRequest();
        const res = createMockResponse();

        const handler = mockApp._routes["/local-script"];
        await handler(req, res, vi.fn());

        expect(res._statusCode).toBe(400);
    });

    it("should return 400 for invalid URL", async () => {
        const mockApp = createMockApp();
        new LocalScriptController(mockApp);

        const req = createMockRequest({ script: "not-a-url" });
        const res = createMockResponse();

        const handler = mockApp._routes["/local-script"];
        await handler(req, res, vi.fn());

        expect(res._statusCode).toBe(400);
    });

    it("should allow localhost with any port", async () => {
        const mockApp = createMockApp();
        new LocalScriptController(mockApp);

        const scriptUrl = "http://localhost:9999/custom/path/script.js";
        const req = createMockRequest({ script: scriptUrl });
        const res = createMockResponse();

        const handler = mockApp._routes["/local-script"];
        await handler(req, res, vi.fn());

        expect(res._statusCode).toBe(200);
        expect(res._body).toContain(scriptUrl);
    });

    it("should allow nested subdomain under localhost", async () => {
        const mockApp = createMockApp();
        new LocalScriptController(mockApp);

        const scriptUrl = "http://sub.domain.localhost/script.js";
        const req = createMockRequest({ script: scriptUrl });
        const res = createMockResponse();

        const handler = mockApp._routes["/local-script"];
        await handler(req, res, vi.fn());

        expect(res._statusCode).toBe(200);
        expect(res._body).toContain(scriptUrl);
    });

    it("should reject domain that merely contains localhost", async () => {
        const mockApp = createMockApp();
        new LocalScriptController(mockApp);

        const scriptUrl = "http://localhost.evil.com/script.js";
        const req = createMockRequest({ script: scriptUrl });
        const res = createMockResponse();

        const handler = mockApp._routes["/local-script"];
        await handler(req, res, vi.fn());

        expect(res._statusCode).toBe(400);
    });

    it("should escape double quotes in script URL to prevent HTML injection", async () => {
        const mockApp = createMockApp();
        new LocalScriptController(mockApp);

        // URL with a double quote character (potential XSS attack vector)
        const scriptUrl = 'http://localhost:3000/script.js?param="malicious';
        const req = createMockRequest({ script: scriptUrl });
        const res = createMockResponse();

        const handler = mockApp._routes["/local-script"];
        await handler(req, res, vi.fn());

        expect(res._statusCode).toBe(200);
        // Verify the double quote is escaped as &quot;
        expect(res._body).toContain('src="http://localhost:3000/script.js?param=&quot;malicious"');
        // Ensure the script tag is properly closed
        expect(res._body).toContain("</script>");
        // Verify no unescaped quotes that could break the HTML attribute
        expect(res._body).not.toContain('param="malicious');
    });
});
