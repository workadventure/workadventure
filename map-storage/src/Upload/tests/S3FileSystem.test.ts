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
    });
});
