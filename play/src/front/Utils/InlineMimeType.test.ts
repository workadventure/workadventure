import { describe, expect, it } from "vitest";
import { DOWNLOAD_MIME_TYPE, sanitizeInlineMimeType } from "./InlineMimeType";

describe("sanitizeInlineMimeType", () => {
    it("should keep allowlisted inline types, normalised", () => {
        expect(sanitizeInlineMimeType("image/png")).toBe("image/png");
        expect(sanitizeInlineMimeType("Image/PNG; charset=binary")).toBe("image/png");
        expect(sanitizeInlineMimeType("video/mp4")).toBe("video/mp4");
    });

    it("should downgrade everything else to a plain download", () => {
        expect(sanitizeInlineMimeType("image/svg+xml")).toBe(DOWNLOAD_MIME_TYPE);
        expect(sanitizeInlineMimeType("text/html")).toBe(DOWNLOAD_MIME_TYPE);
        expect(sanitizeInlineMimeType("application/pdf")).toBe(DOWNLOAD_MIME_TYPE);
        expect(sanitizeInlineMimeType(undefined)).toBe(DOWNLOAD_MIME_TYPE);
    });
});
