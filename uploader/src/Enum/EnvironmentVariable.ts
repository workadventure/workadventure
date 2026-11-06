const UPLOAD_MAX_FILESIZE = process.env.UPLOAD_MAX_FILESIZE;

// Ceiling applied when UPLOAD_MAX_FILESIZE is not set or is not a number: uploaded audio messages
// are buffered in memory, so an upload must never be allowed to grow unbounded.
const DEFAULT_MAX_UPLOAD_SIZE = 100 * 1024 * 1024;
const parsedMaxUploadSize = parseInt(UPLOAD_MAX_FILESIZE ?? "");
export const MAX_UPLOAD_SIZE = parsedMaxUploadSize > 0 ? parsedMaxUploadSize : DEFAULT_MAX_UPLOAD_SIZE;

const REDIS_HOST = process.env.REDIS_HOST;
const REDIS_PORT = process.env.REDIS_PORT || "6379";
const REDIS_DB_NUMBER = process.env.REDIS_DB_NUMBER;
const REDIS_PASSWORD = process.env.REDIS_PASSWORD;

const PLAY_URL = process.env.PLAY_URL;

export const ALLOWED_CORS_ORIGIN = process.env.ALLOWED_CORS_ORIGIN || PLAY_URL || "*";
export const DEBUG_ERROR_MESSAGES = process.env.DEBUG_ERROR_MESSAGES || "";

export {
    PLAY_URL,

    REDIS_HOST,
    REDIS_PORT,
    REDIS_DB_NUMBER,
    REDIS_PASSWORD
};
