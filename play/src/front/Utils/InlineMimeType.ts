// Only types the chat renders inline. Anything else (notably image/svg+xml and text/html, which
// would run scripts at our origin when a same-origin blob: URL is opened as a document) is
// downgraded to a plain download.
const INLINE_MIME_TYPES = new Set([
    "image/png",
    "image/jpeg",
    "image/gif",
    "image/webp",
    "image/avif",
    "audio/mpeg",
    "audio/ogg",
    "audio/wav",
    "audio/webm",
    "audio/mp4",
    "audio/aac",
    "video/mp4",
    "video/webm",
    "video/ogg",
]);

export const DOWNLOAD_MIME_TYPE = "application/octet-stream";

/** The mime type to give a received attachment: an allowlisted inline type, or a plain download. */
export function sanitizeInlineMimeType(mimeType: string | undefined): string {
    const type = mimeType?.split(";")[0].trim().toLowerCase() ?? "";
    return INLINE_MIME_TYPES.has(type) ? type : DOWNLOAD_MIME_TYPE;
}
