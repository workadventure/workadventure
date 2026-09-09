// Mirrors Element's apps/web/src/utils/blobs.ts + MessageEvent.validateImageOrVideoMimetype.
//
// Two separate concerns, kept separate on purpose:
//  - the mime type given to a blob: URL (security). A same-origin blob typed image/svg+xml or
//    text/html runs scripts at our origin when the URL is opened as a document, so anything
//    outside the allowlist is typed application/octet-stream, whatever the event claims.
//  - the tile we render an attachment with (anti-spoofing). Driven by the filename extension,
//    which info.mimetype must agree with. This one never looks at the blob allowlist.

// Taken from Element's ALLOWED_BLOB_MIMETYPES. Never add text/html, image/svg+xml or friends here.
const INLINE_MIME_TYPES = new Set([
    "image/jpeg",
    "image/gif",
    "image/png",
    "image/apng",
    "image/webp",
    "image/avif",

    "video/mp4",
    "video/webm",
    "video/ogg",
    "video/quicktime",

    "audio/mp4",
    "audio/webm",
    "audio/aac",
    "audio/mpeg",
    "audio/ogg",
    "audio/wave",
    "audio/wav",
    "audio/x-wav",
    "audio/x-pn-wav",
    "audio/flac",
    "audio/x-flac",
]);

export const DOWNLOAD_MIME_TYPE = "application/octet-stream";

/** The mime type to give a blob: URL built from a received attachment. */
export function sanitizeInlineMimeType(mimeType: string | undefined): string {
    const type = mimeType?.split(";")[0].trim().toLowerCase() ?? "";
    return INLINE_MIME_TYPES.has(type) ? type : DOWNLOAD_MIME_TYPE;
}

// Element resolves the extension through the `mime` package; we only need to know whether it says
// "image" or "video", so a table beats pulling a full mime database into the front bundle.
const IMAGE_EXTENSIONS = new Set([
    "apng",
    "avif",
    "bmp",
    "gif",
    "heic",
    "heif",
    "ico",
    "jfif",
    "jpeg",
    "jpg",
    "png",
    "svg",
    "tif",
    "tiff",
    "webp",
]);
const VIDEO_EXTENSIONS = new Set(["3gp", "avi", "m4v", "mkv", "mov", "mp4", "mpeg", "mpg", "ogv", "webm", "wmv"]);

function majorTypeFromFilename(filename: string): "image" | "video" | undefined {
    const extension = filename.split(".").pop()?.toLowerCase() ?? "";
    if (IMAGE_EXTENSIONS.has(extension)) {
        return "image";
    }
    if (VIDEO_EXTENSIONS.has(extension)) {
        return "video";
    }
    return undefined;
}

function majorType(mimeType: string | undefined): string | undefined {
    return mimeType?.split("/")[0].trim().toLowerCase();
}

interface MediaLikeContent {
    filename?: string;
    body?: string;
    info?: {
        mimetype?: string;
        thumbnail_info?: {
            mimetype?: string;
        };
    };
}

/**
 * Whether an m.image / m.video event may be rendered as an image or a video, following Element's
 * validateImageOrVideoMimetype: the filename extension has to say image/video, and info.mimetype,
 * when the sender bothered to set it, has to agree with it. Anything else is shown as a file.
 * m.audio is never validated (Element doesn't either).
 */
export function canRenderImageOrVideoInline(content: MediaLikeContent): boolean {
    // As per the spec, body is the filename when filename is absent.
    const filename = content.filename ?? content.body;
    if (filename === undefined || filename === "") {
        return false;
    }
    const thumbnailMimeType = content.info?.thumbnail_info?.mimetype;
    if (thumbnailMimeType !== undefined && majorType(thumbnailMimeType) !== "image") {
        return false;
    }
    const extensionMajorType = majorTypeFromFilename(filename);
    if (extensionMajorType === undefined) {
        return false;
    }
    const declaredMimeType = content.info?.mimetype;
    return declaredMimeType === undefined || majorType(declaredMimeType) === extensionMajorType;
}
