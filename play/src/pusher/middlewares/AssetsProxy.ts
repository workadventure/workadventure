import { Readable } from "node:stream";
import type { ReadableStream } from "node:stream/web";
import type { NextFunction, Request, Response } from "express";

const FORWARDED_REQUEST_HEADERS = ["if-none-match", "if-modified-since"];
// Not content-length / content-encoding: fetch() hands us the decompressed body.
const FORWARDED_RESPONSE_HEADERS = ["content-type", "cache-control", "etag", "last-modified", "expires"];

/**
 * Serves a file of the "front" container from the pusher's own origin. Used for the files that must stay
 * same-origin with the page (service workers, iframe_api.js, static/…) when no ingress rule routes them to the
 * front directly.
 */
export function assetsProxy(internalUrl: string, fetchFn: typeof fetch = fetch) {
    return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        if (req.method !== "GET" && req.method !== "HEAD") {
            next();
            return;
        }
        const headers: Record<string, string> = {};
        for (const name of FORWARDED_REQUEST_HEADERS) {
            const value = req.header(name);
            if (value !== undefined) {
                headers[name] = value;
            }
        }
        const response = await fetchFn(internalUrl + req.originalUrl, { method: req.method, headers });
        res.status(response.status);
        for (const name of FORWARDED_RESPONSE_HEADERS) {
            const value = response.headers.get(name);
            if (value !== null) {
                res.setHeader(name, value);
            }
        }
        if (!response.body || req.method === "HEAD") {
            res.end();
            return;
        }
        Readable.fromWeb(response.body as ReadableStream).pipe(res);
    };
}
