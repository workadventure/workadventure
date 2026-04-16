import type { MatrixClient, MatrixEvent } from "matrix-js-sdk";
import { describe, expect, it } from "vitest";
import { resolveAttachmentMediaFromEvent } from "../MatrixMediaResolver";

describe("resolveAttachmentMediaFromEvent", () => {
    it("should return an HTTP URL for unencrypted m.file", async () => {
        const client = {
            mxcUrlToHttp: (mxc: string) => `https://example.com/media?mxc=${encodeURIComponent(mxc)}`,
        } as unknown as MatrixClient;

        const event = {
            getOriginalContent: () => ({
                msgtype: "m.file",
                body: "report.pdf",
                url: "mxc://example.org/abcdef",
                info: { mimetype: "application/pdf", size: 1024 },
            }),
        } as unknown as MatrixEvent;

        const result = await resolveAttachmentMediaFromEvent(event, client, new AbortController().signal);

        expect(result.error).toBeUndefined();
        expect(result.isEncrypted).toBe(false);
        expect(result.sourceUrl).toBe("https://example.com/media?mxc=mxc%3A%2F%2Fexample.org%2Fabcdef");
        result.cleanup();
    });

    it("should return an HTTP URL for unencrypted m.video", async () => {
        const client = {
            mxcUrlToHttp: (mxc: string) => `https://example.com/v/${encodeURIComponent(mxc)}`,
        } as unknown as MatrixClient;

        const event = {
            getOriginalContent: () => ({
                msgtype: "m.video",
                body: "clip.mp4",
                url: "mxc://example.org/video-id",
                info: { mimetype: "video/mp4" },
            }),
        } as unknown as MatrixEvent;

        const result = await resolveAttachmentMediaFromEvent(event, client, new AbortController().signal);

        expect(result.error).toBeUndefined();
        expect(result.sourceUrl).toContain("mxc%3A%2F%2Fexample.org%2Fvideo-id");
        result.cleanup();
    });

    it("should report download error when content is not a file attachment", async () => {
        const client = {} as unknown as MatrixClient;

        const event = {
            getOriginalContent: () => ({
                msgtype: "m.text",
                body: "hello",
            }),
        } as unknown as MatrixEvent;

        const result = await resolveAttachmentMediaFromEvent(event, client, new AbortController().signal);

        expect(result.error).toBe("download");
        expect(result.sourceUrl).toBeUndefined();
        result.cleanup();
    });
});
