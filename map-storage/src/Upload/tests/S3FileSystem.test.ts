import type { AddressInfo } from "net";
import { PassThrough, Readable } from "stream";
import { GetObjectCommand, ListObjectsV2Command, type S3 } from "@aws-sdk/client-s3";
import express, { type Response } from "express";
import type ZipStream from "zip-stream";
import { describe, expect, it, vi } from "vitest";
import { MapListService } from "../../Services/MapListService";
import { ClientDisconnectedError, S3FileSystem } from "../S3FileSystem";

vi.mock("../../Services/MapListService", () => ({
    MapListService: { CACHE_NAME: "__cache.json" },
}));
vi.mock("../../Services/S3Client", () => ({
    s3UploadConcurrencyLimit: vi.fn(),
}));

describe("S3FileSystem", () => {
    describe("serveStaticFile", () => {
        it("aborts the S3 request (releasing its socket) when the client disconnects", async () => {
            let signal: AbortSignal | undefined;
            const body = new PassThrough();
            const getObject = vi.fn((_input: unknown, opts?: { abortSignal?: AbortSignal }) => {
                signal = opts?.abortSignal;
                return Promise.resolve({ Body: body });
            });
            const fileSystem = new S3FileSystem({ getObject } as unknown as S3, "bucket");
            const response = Object.assign(new PassThrough(), {
                set: vi.fn(),
                req: { fresh: false },
            }) as unknown as Response;
            const next = vi.fn();

            fileSystem.serveStaticFile("map/file.png", response, next);
            await vi.waitFor(() => expect(getObject).toHaveBeenCalledOnce());

            response.destroy();

            // Releasing the socket = aborting the request (destroying the undrained body would leak it).
            await vi.waitFor(() => expect(signal?.aborted).toBe(true));
            expect(next).not.toHaveBeenCalled();
        });

        it("swallows the abort rejection (no next()) when the client disconnected mid-fetch", async () => {
            // The AWS SDK rejects an aborted request with an AbortError carrying our reason as `cause`.
            const abortError = Object.assign(new Error("Request aborted"), {
                name: "AbortError",
                cause: new ClientDisconnectedError(),
            });
            const getObject = vi.fn().mockRejectedValue(abortError);
            const fileSystem = new S3FileSystem({ getObject } as unknown as S3, "bucket");
            const response = Object.assign(new PassThrough(), { set: vi.fn() }) as unknown as Response;
            const next = vi.fn();

            fileSystem.serveStaticFile("map/file.png", response, next);

            await vi.waitFor(() => expect(getObject).toHaveBeenCalledOnce());
            await new Promise((resolve) => {
                setImmediate(resolve);
            });
            // A client disconnect is not an error to forward — no 500, no Sentry noise.
            expect(next).not.toHaveBeenCalled();
        });

        it("does not fetch from S3 at all when the client already disconnected before the read starts", async () => {
            const getObject = vi.fn().mockResolvedValue({ Body: new PassThrough() });
            const fileSystem = new S3FileSystem({ getObject } as unknown as S3, "bucket");
            const set = vi.fn();
            const response = Object.assign(new PassThrough(), { set }) as unknown as Response;
            const next = vi.fn();

            // The client is already gone: skip the S3 round-trip entirely.
            response.destroy();
            fileSystem.serveStaticFile("map/file.png", response, next);

            await new Promise((resolve) => {
                setImmediate(resolve);
            });
            expect(getObject).not.toHaveBeenCalled();
            expect(next).not.toHaveBeenCalled();
            expect(set).not.toHaveBeenCalled();
        });
        /** Serves `path` from a real Express app (its `req.fresh` decides the 304) backed by `getObject`. */
        async function fetchFromS3FileSystem(
            getObject: S3["getObject"],
            path: string,
            headers: Record<string, string> = {},
        ) {
            const fileSystem = new S3FileSystem({ getObject } as unknown as S3, "bucket");
            const app = express();
            app.use((req, res, next) => fileSystem.serveStaticFile(req.path.slice(1), res, next));
            const server = app.listen(0);
            try {
                const { port } = server.address() as AddressInfo;
                const response = await fetch(`http://127.0.0.1:${port}/${path}`, { headers });
                return { status: response.status, contentType: response.headers.get("Content-Type") };
            } finally {
                server.close();
            }
        }

        it("serves map files as JSON even when S3 stored them as application/octet-stream", async () => {
            const getObject = vi.fn().mockResolvedValue({
                Body: Readable.from(["{}"]),
                ContentType: "application/octet-stream",
                ETag: '"abc"',
            });

            const { status, contentType } = await fetchFromS3FileSystem(getObject, "map/office.tmj");

            // application/octet-stream is not compressed by CDNs; application/json is.
            expect(status).toBe(200);
            expect(contentType).toBe("application/json; charset=utf-8");
        });

        it("answers 304 without reading the body when the browser has the same version", async () => {
            let signal: AbortSignal | undefined;
            const getObject = vi.fn((_input: unknown, opts?: { abortSignal?: AbortSignal }) => {
                signal = opts?.abortSignal;
                return Promise.resolve({ Body: new PassThrough(), ETag: '"abc"' });
            });

            // A CDN that compressed the file hands out a weak ETag: it must still match. (Cache-Control is what a
            // browser sends when revalidating; without it, fetch() would add "no-cache", which forbids a 304.)
            const { status } = await fetchFromS3FileSystem(getObject as unknown as S3["getObject"], "map/office.tmj", {
                "If-None-Match": 'W/"abc"',
                "Cache-Control": "max-age=0",
            });

            expect(status).toBe(304);
            // The S3 body is never read: the request is aborted to release its socket.
            expect(signal?.aborted).toBe(true);
        });
    });

    describe("archiveDirectory", () => {
        it("does not fetch bodies for directories or the map list cache", async () => {
            const send = vi.fn().mockResolvedValue({
                Contents: [{ Key: "map/" }, { Key: `map/${MapListService.CACHE_NAME}` }],
                IsTruncated: false,
            });
            const fileSystem = new S3FileSystem({ send } as unknown as S3, "bucket");

            await fileSystem.archiveDirectory({} as ZipStream, "map");

            expect(send).toHaveBeenCalledOnce();
            expect(send.mock.calls[0]?.[0]).toBeInstanceOf(ListObjectsV2Command);
            expect(send.mock.calls.some(([command]) => command instanceof GetObjectCommand)).toBe(false);
        });

        it("aborts the fetch and stops when the archive is destroyed during the fetch", async () => {
            let signal: AbortSignal | undefined;
            const body = new PassThrough();
            const archive = new PassThrough();
            const entry = vi.fn();
            (archive as unknown as { entry: unknown }).entry = entry;

            const send = vi
                .fn()
                .mockResolvedValueOnce({ Contents: [{ Key: "map/a.png" }, { Key: "map/b.png" }], IsTruncated: false })
                // While the first object is being fetched, the client disconnects and the
                // archive is destroyed.
                .mockImplementationOnce((_cmd: unknown, opts?: { abortSignal?: AbortSignal }) => {
                    signal = opts?.abortSignal;
                    archive.destroy();
                    return Promise.resolve({ Body: body });
                });
            const fileSystem = new S3FileSystem({ send } as unknown as S3, "bucket");

            await fileSystem.archiveDirectory(archive as unknown as ZipStream, "map");

            expect(signal?.aborted).toBe(true);
            expect(entry).not.toHaveBeenCalled();
            // ListObjectsV2 + a single GetObject: the second object is never fetched.
            expect(send).toHaveBeenCalledTimes(2);
        });

        it("aborts the S3 request when writing the archive entry fails", async () => {
            let signal: AbortSignal | undefined;
            const body = new PassThrough();
            const archive = new PassThrough();
            (archive as unknown as { entry: unknown }).entry = vi.fn(
                (_source: unknown, _data: unknown, cb: (err: Error | null) => void) => {
                    cb(new Error("boom"));
                    return archive;
                },
            );

            const send = vi
                .fn()
                .mockResolvedValueOnce({ Contents: [{ Key: "map/a.png" }], IsTruncated: false })
                .mockImplementationOnce((_cmd: unknown, opts?: { abortSignal?: AbortSignal }) => {
                    signal = opts?.abortSignal;
                    return Promise.resolve({ Body: body });
                });
            const fileSystem = new S3FileSystem({ send } as unknown as S3, "bucket");

            await expect(fileSystem.archiveDirectory(archive as unknown as ZipStream, "map")).rejects.toThrow("boom");
            expect(signal?.aborted).toBe(true);
        });

        it("aborts the S3 request and resolves when the archive is torn down mid-entry", async () => {
            let signal: AbortSignal | undefined;
            const body = new PassThrough();
            const archive = new PassThrough();
            // entry() never calls back (archiver stalled because its output was destroyed).
            const entry = vi.fn();
            (archive as unknown as { entry: unknown }).entry = entry;

            const send = vi
                .fn()
                .mockResolvedValueOnce({ Contents: [{ Key: "map/a.png" }], IsTruncated: false })
                .mockImplementationOnce((_cmd: unknown, opts?: { abortSignal?: AbortSignal }) => {
                    signal = opts?.abortSignal;
                    return Promise.resolve({ Body: body });
                });
            const fileSystem = new S3FileSystem({ send } as unknown as S3, "bucket");

            const promise = fileSystem.archiveDirectory(archive as unknown as ZipStream, "map");
            await vi.waitFor(() => expect(entry).toHaveBeenCalledOnce());

            // Client disconnects: the archive (piped to the response) is destroyed.
            archive.destroy();

            // archiveDirectory must not hang, and must release the in-flight S3 request.
            await promise;
            expect(signal?.aborted).toBe(true);
        });

        it("rejects and aborts the S3 request when the archive emits a real error mid-entry", async () => {
            let signal: AbortSignal | undefined;
            const body = new PassThrough();
            const archive = new PassThrough();
            // entry() never calls back; the failure surfaces via the archive "error" event.
            const entry = vi.fn();
            (archive as unknown as { entry: unknown }).entry = entry;

            const send = vi
                .fn()
                .mockResolvedValueOnce({ Contents: [{ Key: "map/a.png" }], IsTruncated: false })
                .mockImplementationOnce((_cmd: unknown, opts?: { abortSignal?: AbortSignal }) => {
                    signal = opts?.abortSignal;
                    return Promise.resolve({ Body: body });
                });
            const fileSystem = new S3FileSystem({ send } as unknown as S3, "bucket");

            const promise = fileSystem.archiveDirectory(archive as unknown as ZipStream, "map");
            await vi.waitFor(() => expect(entry).toHaveBeenCalledOnce());

            // A genuine archiving error (not a teardown) must be propagated, not swallowed.
            archive.emit("error", new Error("zip boom"));

            await expect(promise).rejects.toThrow("zip boom");
            expect(signal?.aborted).toBe(true);
        });
    });
});
