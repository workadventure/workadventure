import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("nodeFetch", () => {
    const fetchMock = vi.fn<typeof fetch>();

    beforeEach(() => {
        vi.stubGlobal("fetch", fetchMock);
    });

    afterEach(() => {
        vi.clearAllMocks();
        vi.unstubAllGlobals();
    });

    it("should pass a dns-cached dispatcher to fetch", async () => {
        const { fetch } = await import("../../src/Fetch/nodeFetch");

        fetchMock.mockResolvedValue(
            new Response(null, {
                status: 200,
            })
        );

        await fetch("https://example.com/api/test", {
            headers: {
                Accept: "application/json",
            },
        });

        const requestInit = fetchMock.mock.calls[0]?.[1] as (RequestInit & { dispatcher?: unknown }) | undefined;

        expect(fetchMock.mock.calls[0]?.[0]).toBe("https://example.com/api/test");
        expect(requestInit).toEqual(
            expect.objectContaining({
                headers: {
                    Accept: "application/json",
                },
            })
        );
        expect(requestInit?.dispatcher).toBeDefined();
    });

    it("should throw an HttpError when fetch returns a non-ok response", async () => {
        const { fetch, HttpError } = await import("../../src/Fetch/nodeFetch");

        fetchMock.mockResolvedValue(
            new Response("Service unavailable", {
                status: 503,
                statusText: "Service Unavailable",
            })
        );

        await expect(fetch("https://example.com/api/test")).rejects.toBeInstanceOf(HttpError);
    });
});
