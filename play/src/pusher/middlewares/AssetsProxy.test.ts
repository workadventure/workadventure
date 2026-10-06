import type { AddressInfo } from "node:net";
import express from "express";
import { describe, expect, it, vi } from "vitest";
import { assetsProxy } from "./AssetsProxy";

describe("assetsProxy", () => {
    it("streams the front's file with its caching headers and forwards revalidation headers", async () => {
        const fetchFn = vi.fn<typeof fetch>().mockResolvedValue(
            new Response("self.addEventListener('fetch', () => {});", {
                status: 200,
                headers: { "content-type": "text/javascript", etag: '"abc"', "x-internal": "secret" },
            }),
        );
        const app = express();
        app.get("/service-worker-prod.js", assetsProxy("http://front.internal", fetchFn));
        const server = app.listen(0);
        try {
            const { port } = server.address() as AddressInfo;
            const response = await fetch(`http://127.0.0.1:${port}/service-worker-prod.js?v=1`, {
                headers: { "If-None-Match": '"old"' },
            });

            expect(response.status).toBe(200);
            expect(await response.text()).toBe("self.addEventListener('fetch', () => {});");
            expect(response.headers.get("content-type")).toBe("text/javascript");
            expect(response.headers.get("etag")).toBe('"abc"');
            expect(response.headers.get("x-internal")).toBeNull();
            expect(fetchFn).toHaveBeenCalledWith("http://front.internal/service-worker-prod.js?v=1", {
                method: "GET",
                headers: { "if-none-match": '"old"' },
            });
        } finally {
            server.close();
        }
    });
});
