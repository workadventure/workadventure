import type { AddressInfo } from "node:net";
import express from "express";
import { describe, expect, it, vi } from "vitest";
import { apiVersionHash } from "@workadventure/messages";

vi.mock("../enums/EnvironmentVariable", () => import("../../../tests/pusher/mocks/pusherEnvironmentVariableMock"));
vi.mock("@sentry/node", () => ({ captureException: vi.fn() }));

import * as Sentry from "@sentry/node";
import { LocalFrontAssets, RemoteFrontAssets, rewriteAssetUrls } from "./FrontAssets";

const builtHtml = (hash: string) => `<html><head>
<meta name="wa-api-version" content="${hash}">
<link rel="manifest" href="/manifest.json?url={{ url }}" />
<link rel="icon" href="./static/images/favicons/favicon.ico" />
<script type="module" crossorigin src="./assets/index-Bx1.js"></script>
<link rel="modulepreload" crossorigin href="./assets/vendor-Cy2.js">
<link rel="stylesheet" crossorigin href="./assets/index-Dz3.css">
</head><body>{{{ script }}}</body></html>`;

function response(status: number, body = "", etag?: string): Response {
    return new Response(status === 304 ? null : body, { status, headers: etag ? { etag } : {} });
}

describe("rewriteAssetUrls", () => {
    it("points Vite's build output to the assets domain and leaves public files on the page's origin", () => {
        const html = rewriteAssetUrls(builtHtml("x"), "https://assets.test");
        expect(html).toContain('src="https://assets.test/assets/index-Bx1.js"');
        expect(html).toContain('href="https://assets.test/assets/vendor-Cy2.js"');
        expect(html).toContain('href="https://assets.test/assets/index-Dz3.css"');
        expect(html).toContain('href="/manifest.json?url={{ url }}"');
        expect(html).toContain('href="./static/images/favicons/favicon.ico"');
    });

    it("points the dev server's entry points to the assets domain", () => {
        const html = rewriteAssetUrls(
            '<script type="module" src="/@vite/client"></script><script type="module" src="/src/svelte.ts"></script>',
            "http://front.test",
        );
        expect(html).toBe(
            '<script type="module" src="http://front.test/@vite/client"></script><script type="module" src="http://front.test/src/svelte.ts"></script>',
        );
    });
});

describe("RemoteFrontAssets", () => {
    it("loads the template, then revalidates it with its ETag", async () => {
        const fetchFn = vi
            .fn<typeof fetch>()
            .mockResolvedValueOnce(response(200, builtHtml(apiVersionHash), '"v1"'))
            .mockResolvedValueOnce(response(304));
        const frontAssets = new RemoteFrontAssets("http://front.internal", "https://assets.test", fetchFn);

        expect(frontAssets.getIndexTemplate()).toBeUndefined();
        await frontAssets.refresh();
        expect(frontAssets.getIndexTemplate()).toContain('src="https://assets.test/assets/index-Bx1.js"');

        await frontAssets.refresh();
        expect(fetchFn).toHaveBeenLastCalledWith("http://front.internal/index.html", {
            headers: { "If-None-Match": '"v1"' },
        });
        expect(frontAssets.getIndexTemplate()).toContain("index-Bx1.js");
    });

    it("keeps the current template when the front speaks another protocol", async () => {
        const fetchFn = vi
            .fn<typeof fetch>()
            .mockResolvedValueOnce(response(200, builtHtml(apiVersionHash), '"v1"'))
            .mockImplementation(() =>
                Promise.resolve(response(200, builtHtml("other-hash").replace("Bx1", "NEW"), '"v2"')),
            );
        const frontAssets = new RemoteFrontAssets("http://front.internal", "https://assets.test", fetchFn);
        vi.spyOn(console, "error").mockImplementation(() => {});

        await frontAssets.refresh();
        await frontAssets.refresh();
        await frontAssets.refresh();

        expect(frontAssets.getIndexTemplate()).toContain("index-Bx1.js");
        expect(frontAssets.getIndexTemplate()).not.toContain("index-NEW.js");
        // Polled again and again, but reported once
        expect(Sentry.captureException).toHaveBeenCalledTimes(1);
    });

    it("keeps the current template when the front is down", async () => {
        const fetchFn = vi
            .fn<typeof fetch>()
            .mockResolvedValueOnce(response(200, builtHtml(apiVersionHash)))
            .mockResolvedValueOnce(response(502));
        const frontAssets = new RemoteFrontAssets("http://front.internal", "https://assets.test", fetchFn);

        await frontAssets.refresh();
        await expect(frontAssets.refresh()).rejects.toThrow("HTTP 502");
        expect(frontAssets.getIndexTemplate()).toContain("index-Bx1.js");
    });
});

describe("LocalFrontAssets", () => {
    it("serves the static folders with their own cache duration", async () => {
        const app = express();
        new LocalFrontAssets().registerStaticRoutes(app);
        const server = app.listen(0);
        try {
            const { port } = server.address() as AddressInfo;
            const response = await fetch(`http://127.0.0.1:${port}/static/images/favicons/favicon.ico`);

            expect(response.status).toBe(200);
            // 1 day from the "/static" mount, not 1 hour from the catch-all
            expect(response.headers.get("cache-control")).toBe("public, max-age=86400");
        } finally {
            server.close();
        }
    });
});
