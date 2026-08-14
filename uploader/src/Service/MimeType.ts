import mime from "mime-types";

/**
 * Extensions come from the name of the uploaded file, so they are fully attacker controlled.
 * We only keep short alphanumeric extensions and drop anything else.
 */
const EXTENSION_REGEXP = /^[a-z0-9]{1,12}$/;

/**
 * Content types a browser can render without ever running script.
 * Anything outside this list is served as DEFAULT_MIME_TYPE: the uploader is a dumb file bucket,
 * and echoing back the content type of a user supplied file allows stored XSS (an uploaded
 * ".html" file would otherwise run JavaScript on the uploader origin, which is the play origin
 * on single domain setups).
 */
const INLINE_SAFE_MIME_TYPE_PREFIXES = ["image/", "audio/", "video/"];

/**
 * SVG is an image, but it is also a document that can embed <script>.
 */
const UNSAFE_MIME_TYPES = ["image/svg+xml", "image/svg"];

export const DEFAULT_MIME_TYPE = "application/octet-stream";

class MimeTypeManager {
    /**
     * Returns the (lowercase, alphanumeric) extension of a file name, or undefined if it has
     * none or if it is not a plausible extension.
     */
    getExtensionByFileName(name: string): string | undefined {
        const parts = name.split(".");
        if (parts.length < 2) {
            return undefined;
        }
        const extension = parts.pop()?.toLowerCase();
        if (!extension || !EXTENSION_REGEXP.test(extension)) {
            return undefined;
        }
        return extension;
    }

    getMimeTypeByFileName(name: string): string | false {
        const extension = this.getExtensionByFileName(name);
        if (!extension) {
            return false;
        }
        return mime.contentType(extension);
    }

    /**
     * Returns a content type that is safe to send back to a browser for user uploaded content.
     */
    getSafeMimeType(mimeType: string | false | undefined): string {
        if (!mimeType) {
            return DEFAULT_MIME_TYPE;
        }
        const type = mimeType.split(";")[0].trim().toLowerCase();
        if (UNSAFE_MIME_TYPES.includes(type)) {
            return DEFAULT_MIME_TYPE;
        }
        if (!INLINE_SAFE_MIME_TYPE_PREFIXES.some((prefix) => type.startsWith(prefix))) {
            return DEFAULT_MIME_TYPE;
        }
        return mimeType;
    }

    getSafeMimeTypeByFileName(name: string): string {
        return this.getSafeMimeType(this.getMimeTypeByFileName(name));
    }
}

export const mimeTypeManager = new MimeTypeManager();
