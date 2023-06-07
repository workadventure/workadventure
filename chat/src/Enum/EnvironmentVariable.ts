import { getEnvConfig } from "@geprog/vite-plugin-env-config/getEnvConfig"; // eslint-disable-line import/no-unresolved

const PUSHER_URL = getEnvConfig("PUSHER_URL") || "//play.workadventure.localhost";
const ADMIN_API_URL = getEnvConfig("ADMIN_API_URL") || undefined;
const ENABLE_CHAT_UPLOAD = getEnvConfig("ENABLE_CHAT_UPLOAD") !== "false";
const FALLBACK_LOCALE = getEnvConfig("FALLBACK_LOCALE") || undefined;
const UPLOADER_URL = getEnvConfig("UPLOADER_URL") || undefined;
const EMBEDLY_KEY = getEnvConfig("EMBEDLY_KEY") || undefined;
const ICON_URL = getEnvConfig("ICON_URL") || undefined;
const enableOpenID = getEnvConfig("ENABLE_OPENID");
const ENABLE_OPENID =
    enableOpenID !== "" && enableOpenID != undefined && enableOpenID != "0" && enableOpenID.toLowerCase() !== "false";

const EJABBERD_DOMAIN: string = getEnvConfig("EJABBERD_DOMAIN") || "";
const EJABBERD_WS_URI: string = getEnvConfig("EJABBERD_WS_URI") || "";

const SENTRY_DSN = getEnvConfig("SENTRY_DSN");
const SENTRY_ENVIRONMENT = getEnvConfig("SENTRY_ENVIRONMENT");
const SENTRY_RELEASE = getEnvConfig("SENTRY_RELEASE");
const SENTRY_TRACES_SAMPLE_RATE = getEnvConfig("SENTRY_TRACES_SAMPLE_RATE");

export {
    PUSHER_URL,
    FALLBACK_LOCALE,
    UPLOADER_URL,
    EMBEDLY_KEY,
    ICON_URL,
    ENABLE_OPENID,
    ENABLE_CHAT_UPLOAD,
    ADMIN_API_URL,
    EJABBERD_DOMAIN,
    EJABBERD_WS_URI,
    SENTRY_DSN,
    SENTRY_ENVIRONMENT,
    SENTRY_RELEASE,
    SENTRY_TRACES_SAMPLE_RATE,
};
