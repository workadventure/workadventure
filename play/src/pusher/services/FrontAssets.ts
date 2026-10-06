import fs from "fs";
import type { Application } from "express";
import express from "express";
import Mustache from "mustache";
import * as Sentry from "@sentry/node";
import { asError } from "catch-unknown";
import { apiVersionHash } from "@workadventure/messages";
import { ASSETS_INTERNAL_URL, ASSETS_URL } from "../enums/EnvironmentVariable";
import { assetsProxy } from "../middlewares/AssetsProxy";

const REFRESH_INTERVAL_MS = 30_000;
// Until the first template is loaded, the pusher is not ready: retry quickly.
const RETRY_INTERVAL_MS = 2_000;

/**
 * Points the files emitted by Vite to the assets domain: "./assets/…" in a production build (base "./"),
 * "/src/…" and "/@vite/…" from the dev server. Public files ("./static/…", "/static/…") are left alone: they
 * must stay on the page's origin (service workers, iframe_api.js).
 */
export function rewriteAssetUrls(html: string, assetsUrl: string): string {
    return html.replace(
        /(\s(?:src|href)=")(?:\.\/(assets\/)|\/((?:src|@vite)\/))/g,
        (_match, attribute: string, built: string | undefined, dev: string | undefined) =>
            `${attribute}${assetsUrl}/${built ?? dev}`,
    );
}

export function extractApiVersion(html: string): string | undefined {
    return /<meta name="wa-api-version" content="([^"]*)"/.exec(html)?.[1];
}

/**
 * Where the front build (the index.html template and the static files) comes from.
 */
export interface FrontAssets {
    /** The index.html Mustache template, or undefined while it is not loaded yet (the pusher is then not ready). */
    getIndexTemplate(): string | undefined;
    /** Serves the static files of the front build from the pusher's origin. */
    registerStaticRoutes(app: Application): void;
}

/**
 * The front build shipped in the pusher image (or the sources themselves in dev).
 */
export class LocalFrontAssets implements FrontAssets {
    private readonly html: string;
    private readonly publicPath: string;

    constructor() {
        let indexPath: string;
        if (fs.existsSync("dist/public/index.html")) {
            // In prod mode
            indexPath = "dist/public/index.html";
        } else if (fs.existsSync("index.html")) {
            // In dev mode
            indexPath = "index.html";
        } else {
            throw new Error("Could not find index.html file");
        }
        this.html = fs.readFileSync(indexPath, "utf8");
        // Pre-parse the index file for speed (and validation)
        Mustache.parse(this.html);

        if (fs.existsSync("dist/public")) {
            // In prod mode
            this.publicPath = "dist/public";
        } else if (fs.existsSync("public")) {
            // In dev mode
            this.publicPath = "public";
        } else {
            throw new Error("Could not find public folder");
        }
    }

    public getIndexTemplate(): string {
        return this.html;
    }

    public registerStaticRoutes(app: Application): void {
        const staticOptions = {
            extensions: [
                ".css",
                ".js",
                ".png",
                ".svg",
                ".ico",
                ".xml",
                ".mp3",
                ".json",
                ".html",
                ".ttf",
                ".woff2",
                ".map",
                ".gif",
                ".odf",
            ],
            etag: true,
            maxAge: "15d",
        };

        app.use(
            "/assets",
            express.static(this.publicPath + "/assets", {
                ...staticOptions,
                // Vite content-hashes everything under /assets, so the CDN edge may keep it forever.
                maxAge: "1y",
                immutable: true,
            }),
        );

        app.use(
            "/resources",
            express.static(this.publicPath + "/resources", {
                ...staticOptions,
                maxAge: "1d",
            }),
        );

        app.use(
            "/static",
            express.static(this.publicPath + "/static", {
                ...staticOptions,
                maxAge: "1d",
            }),
        );

        app.use(
            "/collections",
            express.static(this.publicPath + "/collections", {
                ...staticOptions,
                maxAge: "1d",
            }),
        );

        app.use(
            express.static(this.publicPath, {
                ...staticOptions,
                maxAge: "1h",
            }),
        );
    }
}

/**
 * The front build served by the "front" container (ASSETS_URL). The front can be deployed alone, so the template
 * (which holds the hashed names of the entry files) is polled instead of being read from the pusher image.
 */
export class RemoteFrontAssets implements FrontAssets {
    private html: string | undefined;
    private etag = "";
    private reportedApiVersion: string | undefined;

    constructor(
        private readonly internalUrl: string,
        private readonly assetsUrl: string,
        private readonly fetchFn: typeof fetch = fetch,
    ) {}

    public getIndexTemplate(): string | undefined {
        return this.html;
    }

    public registerStaticRoutes(app: Application): void {
        // Files that must stay same-origin with the page. Ingress rules should route these paths to the front
        // container directly; this proxy is the fallback when they don't.
        const proxy = assetsProxy(this.internalUrl);
        app.use(["/assets", "/static", "/resources", "/collections"], proxy);
        app.get(
            [
                "/iframe_api.js",
                "/iframe_api.js.map",
                "/service-worker-dev.js",
                "/service-worker-prod.js",
                "/notification-service-worker.js",
            ],
            proxy,
        );
    }

    public async refresh(): Promise<void> {
        const response = await this.fetchFn(`${this.internalUrl}/index.html`, {
            headers: this.etag ? { "If-None-Match": this.etag } : {},
        });
        if (response.status === 304) {
            return;
        }
        if (!response.ok) {
            throw new Error(`Could not fetch the front template: HTTP ${response.status}`);
        }
        const html = await response.text();
        const frontApiVersion = extractApiVersion(html);
        if (frontApiVersion !== apiVersionHash) {
            // This front speaks another protocol than this pusher: keep serving the current template.
            const error = new Error(
                `Ignoring the front template: its apiVersionHash "${frontApiVersion}" does not match the pusher's "${apiVersionHash}"`,
            );
            console.error(error.message);
            // The template is polled every few seconds: report each rejected front version to Sentry only once.
            if (this.reportedApiVersion !== frontApiVersion) {
                this.reportedApiVersion = frontApiVersion;
                Sentry.captureException(error);
            }
            return;
        }
        const template = rewriteAssetUrls(html, this.assetsUrl);
        Mustache.parse(template);
        this.html = template;
        this.etag = response.headers.get("etag") ?? "";
    }

    public startPolling(): void {
        const poll = async (): Promise<void> => {
            try {
                await this.refresh();
            } catch (e: unknown) {
                const error = asError(e);
                console.error("Failed to refresh the front template", error);
                // Transient while the front is starting; only worth a Sentry event once we were serving pages.
                if (this.html) {
                    Sentry.captureException(error);
                }
            }
            setTimeout(
                () => {
                    poll().catch((e) => console.error(e));
                },
                this.html ? REFRESH_INTERVAL_MS : RETRY_INTERVAL_MS,
            ).unref();
        };
        poll().catch((e) => console.error(e));
    }
}

/**
 * The front build comes from the "front" container when ASSETS_URL is set, from the pusher image otherwise.
 */
export function createFrontAssets(): FrontAssets {
    if (ASSETS_URL && ASSETS_INTERNAL_URL) {
        const frontAssets = new RemoteFrontAssets(ASSETS_INTERNAL_URL, ASSETS_URL);
        frontAssets.startPolling();
        return frontAssets;
    }
    return new LocalFrontAssets();
}
