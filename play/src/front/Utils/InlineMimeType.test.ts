import { describe, expect, it } from "vitest";
import { DOWNLOAD_MIME_TYPE, canRenderImageOrVideoInline, sanitizeInlineMimeType } from "./InlineMimeType";

describe("sanitizeInlineMimeType", () => {
    it("should keep allowlisted inline types, normalised", () => {
        expect(sanitizeInlineMimeType("image/png")).toBe("image/png");
        expect(sanitizeInlineMimeType("Image/PNG; charset=binary")).toBe("image/png");
        expect(sanitizeInlineMimeType("video/mp4")).toBe("video/mp4");
        expect(sanitizeInlineMimeType("audio/x-flac")).toBe("audio/x-flac");
    });

    it("should downgrade everything else to a plain download", () => {
        expect(sanitizeInlineMimeType("image/svg+xml")).toBe(DOWNLOAD_MIME_TYPE);
        expect(sanitizeInlineMimeType("text/html")).toBe(DOWNLOAD_MIME_TYPE);
        expect(sanitizeInlineMimeType("application/pdf")).toBe(DOWNLOAD_MIME_TYPE);
        expect(sanitizeInlineMimeType(undefined)).toBe(DOWNLOAD_MIME_TYPE);
    });
});

describe("canRenderImageOrVideoInline", () => {
    it("should render an attachment whose extension and mimetype agree", () => {
        expect(canRenderImageOrVideoInline({ body: "cat.png", info: { mimetype: "image/png" } })).toBe(true);
        expect(canRenderImageOrVideoInline({ body: "clip.mp4", info: { mimetype: "video/mp4" } })).toBe(true);
        expect(canRenderImageOrVideoInline({ filename: "cat.PNG", body: "a caption" })).toBe(true);
    });

    it("should still render when the sender omitted the mimetype", () => {
        expect(canRenderImageOrVideoInline({ body: "cat.png" })).toBe(true);
        expect(canRenderImageOrVideoInline({ body: "clip.webm", info: {} })).toBe(true);
    });

    it("should refuse an attachment whose mimetype contradicts its extension", () => {
        expect(canRenderImageOrVideoInline({ body: "invoice.png", info: { mimetype: "application/pdf" } })).toBe(false);
        expect(canRenderImageOrVideoInline({ body: "clip.mp4", info: { mimetype: "image/png" } })).toBe(false);
    });

    it("should refuse an attachment without a usable filename", () => {
        expect(canRenderImageOrVideoInline({ body: "screenshot", info: { mimetype: "image/png" } })).toBe(false);
        expect(canRenderImageOrVideoInline({ body: "notes.txt", info: { mimetype: "image/png" } })).toBe(false);
        expect(canRenderImageOrVideoInline({})).toBe(false);
    });

    it("should refuse an attachment whose thumbnail is not an image", () => {
        expect(
            canRenderImageOrVideoInline({
                body: "cat.png",
                info: { mimetype: "image/png", thumbnail_info: { mimetype: "text/html" } },
            }),
        ).toBe(false);
    });
});
