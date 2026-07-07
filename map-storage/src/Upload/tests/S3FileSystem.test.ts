import { PassThrough } from "stream";
import { GetObjectCommand, ListObjectsV2Command, type S3 } from "@aws-sdk/client-s3";
import type { Response } from "express";
import type ZipStream from "zip-stream";
import { describe, expect, it, vi } from "vitest";
import { MapListService } from "../../Services/MapListService";
import { S3FileSystem } from "../S3FileSystem";

vi.mock("../../Services/MapListService", () => ({
    MapListService: { CACHE_NAME: "__cache.json" },
}));
vi.mock("../../Services/S3Client", () => ({
    s3UploadConcurrencyLimit: vi.fn(),
}));

describe("S3FileSystem", () => {
    describe("serveStaticFile", () => {
        it("destroys the S3 response body when the client disconnects", async () => {
            const body = new PassThrough();
            const getObject = vi.fn().mockResolvedValue({ Body: body });
            const fileSystem = new S3FileSystem({ getObject } as unknown as S3, "bucket");
            const response = Object.assign(new PassThrough(), { set: vi.fn() }) as unknown as Response;
            const next = vi.fn();

            fileSystem.serveStaticFile("map/file.png", response, next);
            await vi.waitFor(() => expect(getObject).toHaveBeenCalledOnce());

            response.destroy();

            await vi.waitFor(() => expect(body.destroyed).toBe(true));
            expect(next).not.toHaveBeenCalled();
        });

        it("destroys the S3 response body when the client already disconnected before it was fetched", async () => {
            const body = new PassThrough();
            const getObject = vi.fn().mockResolvedValue({ Body: body });
            const fileSystem = new S3FileSystem({ getObject } as unknown as S3, "bucket");
            const set = vi.fn();
            const response = Object.assign(new PassThrough(), { set }) as unknown as Response;
            const next = vi.fn();

            // The client is already gone by the time getObject resolves.
            response.destroy();
            fileSystem.serveStaticFile("map/file.png", response, next);

            await vi.waitFor(() => expect(body.destroyed).toBe(true));
            expect(next).not.toHaveBeenCalled();
            expect(set).not.toHaveBeenCalled();
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

        it("destroys the fetched body and stops when the archive is destroyed during the fetch", async () => {
            const body = new PassThrough();
            const archive = new PassThrough();
            const entry = vi.fn();
            (archive as unknown as { entry: unknown }).entry = entry;

            const send = vi
                .fn()
                .mockResolvedValueOnce({ Contents: [{ Key: "map/a.png" }, { Key: "map/b.png" }], IsTruncated: false })
                // While the first object is being fetched, the client disconnects and the
                // archive is destroyed.
                .mockImplementationOnce(() => {
                    archive.destroy();
                    return Promise.resolve({ Body: body });
                });
            const fileSystem = new S3FileSystem({ send } as unknown as S3, "bucket");

            await fileSystem.archiveDirectory(archive as unknown as ZipStream, "map");

            expect(body.destroyed).toBe(true);
            expect(entry).not.toHaveBeenCalled();
            // ListObjectsV2 + a single GetObject: the second object is never fetched.
            expect(send).toHaveBeenCalledTimes(2);
        });

        it("destroys the S3 body when writing the archive entry fails", async () => {
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
                .mockResolvedValueOnce({ Body: body });
            const fileSystem = new S3FileSystem({ send } as unknown as S3, "bucket");

            await expect(fileSystem.archiveDirectory(archive as unknown as ZipStream, "map")).rejects.toThrow("boom");
            expect(body.destroyed).toBe(true);
        });

        it("destroys the S3 body and resolves when the archive is torn down mid-entry", async () => {
            const body = new PassThrough();
            const archive = new PassThrough();
            // entry() never calls back (archiver stalled because its output was destroyed).
            const entry = vi.fn();
            (archive as unknown as { entry: unknown }).entry = entry;

            const send = vi
                .fn()
                .mockResolvedValueOnce({ Contents: [{ Key: "map/a.png" }], IsTruncated: false })
                .mockResolvedValueOnce({ Body: body });
            const fileSystem = new S3FileSystem({ send } as unknown as S3, "bucket");

            const promise = fileSystem.archiveDirectory(archive as unknown as ZipStream, "map");
            await vi.waitFor(() => expect(entry).toHaveBeenCalledOnce());

            // Client disconnects: the archive (piped to the response) is destroyed.
            archive.destroy();

            // archiveDirectory must not hang, and must release the in-flight S3 body.
            await promise;
            expect(body.destroyed).toBe(true);
        });

        it("rejects and destroys the S3 body when the archive emits a real error mid-entry", async () => {
            const body = new PassThrough();
            const archive = new PassThrough();
            // entry() never calls back; the failure surfaces via the archive "error" event.
            const entry = vi.fn();
            (archive as unknown as { entry: unknown }).entry = entry;

            const send = vi
                .fn()
                .mockResolvedValueOnce({ Contents: [{ Key: "map/a.png" }], IsTruncated: false })
                .mockResolvedValueOnce({ Body: body });
            const fileSystem = new S3FileSystem({ send } as unknown as S3, "bucket");

            const promise = fileSystem.archiveDirectory(archive as unknown as ZipStream, "map");
            await vi.waitFor(() => expect(entry).toHaveBeenCalledOnce());

            // A genuine archiving error (not a teardown) must be propagated, not swallowed.
            archive.emit("error", new Error("zip boom"));

            await expect(promise).rejects.toThrow("zip boom");
            expect(body.destroyed).toBe(true);
        });
    });
});
