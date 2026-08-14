// Note: this used to be `process.env.ENABLE_CHAT_UPLOAD || true`, which is truthy for the string
// "false" too, so uploads could not be disabled at all on a self-hosted instance.
const ENABLE_CHAT_UPLOAD = !["false", "0"].includes((process.env.ENABLE_CHAT_UPLOAD ?? "true").toLowerCase());
const UPLOAD_MAX_FILESIZE = process.env.UPLOAD_MAX_FILESIZE;

// Ceiling applied when UPLOAD_MAX_FILESIZE is not set or is not a number (the size is then only
// enforced by the admin API, which can answer once the whole file has been received).
const DEFAULT_MAX_UPLOAD_SIZE = 100 * 1024 * 1024;
const parsedMaxUploadSize = parseInt(UPLOAD_MAX_FILESIZE ?? "");
export const MAX_UPLOAD_SIZE = parsedMaxUploadSize > 0 ? parsedMaxUploadSize : DEFAULT_MAX_UPLOAD_SIZE;
const ADMIN_API_URL = process.env.ADMIN_API_URL;

const AWS_ACCESS_KEY_ID = process.env.AWS_ACCESS_KEY_ID;
const AWS_SECRET_ACCESS_KEY = process.env.AWS_SECRET_ACCESS_KEY;
const AWS_DEFAULT_REGION = process.env.AWS_DEFAULT_REGION;
const AWS_BUCKET = process.env.AWS_BUCKET;
const AWS_ENDPOINT = process.env.AWS_ENDPOINT;
const UPLOADER_AWS_SIGNED_URL_EXPIRATION = parseInt(process.env.UPLOADER_AWS_SIGNED_URL_EXPIRATION || "60")

const REDIS_HOST = process.env.REDIS_HOST;
const REDIS_PORT = process.env.REDIS_PORT || "6379";
const REDIS_DB_NUMBER = process.env.REDIS_DB_NUMBER;
const REDIS_PASSWORD = process.env.REDIS_PASSWORD;

const UPLOADER_URL = process.env.UPLOADER_URL;
const PLAY_URL = process.env.PLAY_URL;

export const ALLOWED_CORS_ORIGIN = process.env.ALLOWED_CORS_ORIGIN || PLAY_URL || "*";
export const DEBUG_ERROR_MESSAGES = process.env.DEBUG_ERROR_MESSAGES || "";

export {
    ENABLE_CHAT_UPLOAD,
    UPLOAD_MAX_FILESIZE,
    ADMIN_API_URL,
    UPLOADER_URL,
    PLAY_URL,

    AWS_ACCESS_KEY_ID,
    AWS_SECRET_ACCESS_KEY,
    AWS_DEFAULT_REGION,
    AWS_BUCKET,
    AWS_ENDPOINT,
    UPLOADER_AWS_SIGNED_URL_EXPIRATION,

    REDIS_HOST,
    REDIS_PORT,
    REDIS_DB_NUMBER,
    REDIS_PASSWORD
};
