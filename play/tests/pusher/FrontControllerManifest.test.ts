/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../src/pusher/enums/EnvironmentVariable", async () => ({
    ...(await import("./mocks/pusherEnvironmentVariableMock")),
    ADMIN_API_URL: "http://admin.test",
}));

const { fetchMapDetails } = vi.hoisted(() => ({ fetchMapDetails: vi.fn() }));
vi.mock("../../src/pusher/services/AdminService", () => ({
    adminService: {
        fetchMapDetails,
        getCapabilities: () => Promise.resolve({}),
    },
}));

import { FrontController } from "../../src/pusher/controllers/FrontController";

const ROOM_URL = "http://play.test:8080/@/acme/hq/lobby?a=1&b=2";

function getRoutes(): Record<string, (req: any, res: any) => Promise<void> | void> {
    const routes: Record<string, (req: any, res: any) => Promise<void> | void> = {};
    const app: any = {
        get: (path: string, ...handlers: ((req: any, res: any) => Promise<void> | void)[]) => {
            routes[path] = handlers[handlers.length - 1];
        },
        post: () => undefined,
    };
    new FrontController(app);
    return routes;
}

function mockRequest(query: Record<string, string>, originalUrl = "/"): any {
    return {
        query,
        method: "GET",
        originalUrl,
        protocol: "http",
        header: () => undefined,
        get: () => "play.test:8080",
    };
}

function mockResponse(): any {
    const res: any = {};
    for (const method of ["status", "contentType", "set", "type"]) {
        res[method] = vi.fn(() => res);
    }
    res.json = vi.fn(() => res);
    res.send = vi.fn(() => res);
    return res;
}

async function getManifest(url: string): Promise<any> {
    const res = mockResponse();
    await getRoutes()["/static/images/favicons/manifest.json"](mockRequest({ url }), res);
    return res.json.mock.calls[0][0];
}

describe("FrontController web app manifest", () => {
    beforeEach(() => {
        fetchMapDetails.mockReset();
    });

    it("should use the app names set in the admin and the whole room URL as start URL", async () => {
        fetchMapDetails.mockResolvedValue({
            group: null,
            metatags: { title: "Acme HQ", appName: "Acme", shortAppName: "AC" },
        });

        const manifest = await getManifest(ROOM_URL);

        expect(manifest.name).toBe("Acme");
        expect(manifest.short_name).toBe("AC");
        expect(manifest.start_url).toBe("/@/acme/hq/lobby?a=1&b=2");
        expect(manifest.display_override).toEqual(["minimal-ui"]);
        expect(manifest.orientation).toBeUndefined();
    });

    it("should fall back to the page title, and the short name to the app name", async () => {
        fetchMapDetails.mockResolvedValue({ group: null, metatags: { title: "Acme HQ" } });
        let manifest = await getManifest(ROOM_URL);
        expect(manifest.name).toBe("Acme HQ");
        expect(manifest.short_name).toBe("Acme HQ");

        fetchMapDetails.mockResolvedValue({ group: null, metatags: { title: "Acme HQ", appName: "Acme" } });
        manifest = await getManifest(ROOM_URL);
        expect(manifest.name).toBe("Acme");
        expect(manifest.short_name).toBe("Acme");
    });

    it("should refuse a url parameter that is not a URL", async () => {
        const res = mockResponse();
        await getRoutes()["/static/images/favicons/manifest.json"](mockRequest({ url: "/@/acme/hq/lobby" }), res);
        expect(res.status).toHaveBeenCalledWith(400);
    });

    it("should URL-encode the room URL in the manifest link of the page", async () => {
        fetchMapDetails.mockResolvedValue({ group: null, metatags: { title: "Acme HQ" } });
        const res = mockResponse();

        await getRoutes()["/_/{*splat}"](mockRequest({}, "/@/acme/hq/lobby?a=1&b=2"), res);

        expect(res.send.mock.calls[0][0]).toContain(
            `href="/static/images/favicons/manifest.json?url=${encodeURIComponent(ROOM_URL)}"`,
        );
    });
});
