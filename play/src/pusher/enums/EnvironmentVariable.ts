import type { FrontConfigurationInterface } from "../../common/FrontConfigurationInterface";
import { EnvironmentVariables } from "./EnvironmentVariableValidator";

const envChecking = EnvironmentVariables.safeParse(process.env);

// Will break the process if an error happens
if (!envChecking.success) {
    console.error("\n\n\n-----------------------------------------");
    console.error("FATAL ERRORS FOUND IN ENVIRONMENT VARIABLES!!!");
    console.error("-----------------------------------------\n");

    const formattedError = envChecking.error.format();

    for (const [name, value] of Object.entries(formattedError)) {
        if (Array.isArray(value)) {
            continue;
        }

        for (const error of value._errors) {
            console.error(`For variable "${name}": ${error}`);
        }
    }

    console.error("\n-----------------------------------------\n\n\n");

    process.exit(1);
}

const env = envChecking.data;

export const SECRET_KEY = env.SECRET_KEY;
export const API_URL = env.API_URL;
export const ADMIN_API_URL = env.ADMIN_API_URL;
export const ADMIN_API_RETRY_DELAY = parseInt(process.env.ADMIN_API_RETRY_DELAY || "500");
export const ADMIN_URL = env.ADMIN_URL;
export const ADMIN_BO_URL = env.ADMIN_BO_URL || env.ADMIN_URL;
export const AUTOLOGIN_URL = env.AUTOLOGIN_URL ?? env.ADMIN_URL + "/workadventure/login";
export const ADMIN_API_TOKEN = env.ADMIN_API_TOKEN;
export const MAP_STORAGE_API_TOKEN = env.MAP_STORAGE_API_TOKEN;
export const ADMIN_SOCKETS_TOKEN = env.ADMIN_SOCKETS_TOKEN;
export const CPU_OVERHEAT_THRESHOLD = env.CPU_OVERHEAT_THRESHOLD;
export const PUSHER_HTTP_PORT = env.PUSHER_HTTP_PORT;

export const PUSHER_WS_PORT = env.PUSHER_WS_PORT;
export const SOCKET_IDLE_TIMER = env.SOCKET_IDLE_TIMER; // maximum time (in second) without activity before a socket is closed. Should be greater than 60 seconds in order to cope for Chrome intensive throttling (https://developer.chrome.com/blog/timer-throttling-in-chrome-88/#intensive-throttling)
export const ALLOWED_CORS_ORIGIN = env.ALLOWED_CORS_ORIGIN; // Use "*" to allow any domain
export const PUSHER_URL = env.PUSHER_URL || "";
export const FRONT_URL = env.FRONT_URL || "";
export const VITE_URL = env.VITE_URL || FRONT_URL; // Used only in development
export const PUBLIC_MAP_STORAGE_URL = env.PUBLIC_MAP_STORAGE_URL || "";
export const INTERNAL_MAP_STORAGE_URL = env.INTERNAL_MAP_STORAGE_URL;
export const OPID_CLIENT_ID = env.OPID_CLIENT_ID || "";
export const OPID_CLIENT_SECRET = env.OPID_CLIENT_SECRET || "";
export const OPID_CLIENT_ISSUER = env.OPID_CLIENT_ISSUER || "";
if (OPID_CLIENT_ID && !PUSHER_URL) {
    throw new Error("Missing PUSHER_URL environment variable.");
}
export const OPID_CLIENT_REDIRECT_URL = PUSHER_URL + "/openid-callback";
export const OPID_CLIENT_REDIRECT_LOGOUT_URL = PUSHER_URL + "/logout-callback";
export const OPID_PROFILE_SCREEN_PROVIDER =
    env.OPID_PROFILE_SCREEN_PROVIDER || (ADMIN_URL ? ADMIN_URL + "/profile" : undefined);
export const OPID_SCOPE = env.OPID_SCOPE || "openid email profile ";
export const OPID_PROMPT = env.OPID_PROMPT || "login";
export const OPID_USERNAME_CLAIM = env.OPID_USERNAME_CLAIM || "username";
export const OPID_LOCALE_CLAIM = env.OPID_LOCALE_CLAIM || "locale";
export const OPID_WOKA_NAME_POLICY = env.OPID_WOKA_NAME_POLICY || "user_input";
export const OPID_TAGS_CLAIM = env.OPID_TAGS_CLAIM || "tags";
export const DISABLE_ANONYMOUS: boolean = env.DISABLE_ANONYMOUS;
export const PROMETHEUS_AUTHORIZATION_TOKEN = env.PROMETHEUS_AUTHORIZATION_TOKEN;
export const PROMETHEUS_PORT = env.PROMETHEUS_PORT === env.PUSHER_HTTP_PORT ? 0 : env.PROMETHEUS_PORT;
export const ENABLE_CHAT: boolean = env.ENABLE_CHAT;
export const ENABLE_CHAT_UPLOAD: boolean = env.ENABLE_CHAT_UPLOAD;
export const ENABLE_CHAT_ONLINE_LIST: boolean = env.ENABLE_CHAT_ONLINE_LIST;
export const ENABLE_CHAT_DISCONNECTED_LIST: boolean = env.ENABLE_CHAT_DISCONNECTED_LIST;
//export const DEBUG_ERROR_MESSAGES = env.DEBUG_ERROR_MESSAGES;

// If set to the string "true", the /openapi route will return the OpenAPI definition and the swagger-ui/ route will display the documentation
export const ENABLE_OPENAPI_ENDPOINT = env.ENABLE_OPENAPI_ENDPOINT;

// The URL to use if the user is visiting the first time and hitting the "/" route.
export const START_ROOM_URL: string = env.START_ROOM_URL || "/_/global/maps.workadventu.re/starter/map.json";
export const FALLBACK_LOCALE: string | undefined = env.FALLBACK_LOCALE;

// Logrocket id
export const LOGROCKET_ID: string | undefined = env.LOGROCKET_ID;

// Sentry integration
export const SENTRY_DSN: string | undefined = env.SENTRY_DSN_PUSHER;
export const SENTRY_ENVIRONMENT: string | undefined = env.SENTRY_ENVIRONMENT;
export const SENTRY_RELEASE: string | undefined = env.SENTRY_RELEASE;
export const SENTRY_TRACES_SAMPLE_RATE: number | undefined = env.SENTRY_TRACES_SAMPLE_RATE;

// RoomAPI
export const ROOM_API_PORT = env.ROOM_API_PORT;
export const ROOM_API_SECRET_KEY = env.ROOM_API_SECRET_KEY;

// Map editor
export const ENABLE_MAP_EDITOR: boolean = env.ENABLE_MAP_EDITOR;
export const MAP_EDITOR_ALLOWED_USERS: string[] = env.MAP_EDITOR_ALLOWED_USERS;
export const MAP_EDITOR_ALLOW_ALL_USERS: boolean = env.MAP_EDITOR_ALLOW_ALL_USERS;

// Integration tools
export const KLAXOON_ENABLED = env.KLAXOON_ENABLED;
export const KLAXOON_CLIENT_ID = env.KLAXOON_CLIENT_ID;
export const YOUTUBE_ENABLED = env.YOUTUBE_ENABLED;
export const GOOGLE_DRIVE_ENABLED = env.GOOGLE_DRIVE_ENABLED;
export const GOOGLE_DOCS_ENABLED = env.GOOGLE_DOCS_ENABLED;
export const GOOGLE_SHEETS_ENABLED = env.GOOGLE_SHEETS_ENABLED;
export const GOOGLE_SLIDES_ENABLED = env.GOOGLE_SLIDES_ENABLED;
export const ERASER_ENABLED = env.ERASER_ENABLED;
export const EXCALIDRAW_ENABLED = env.EXCALIDRAW_ENABLED;
export const EXCALIDRAW_DOMAINS = env.EXCALIDRAW_DOMAINS;
export const EMBEDDED_DOMAINS_WHITELIST = env.EMBEDDED_DOMAINS_WHITELIST;
export const CARDS_ENABLED = env.CARDS_ENABLED;

//Google drive oauth for picker
export const GOOGLE_DRIVE_PICKER_CLIENT_ID = env.GOOGLE_DRIVE_PICKER_CLIENT_ID;
export const GOOGLE_DRIVE_PICKER_API_KEY = env.GOOGLE_DRIVE_PICKER_API_KEY;
export const GOOGLE_DRIVE_PICKER_APP_ID = env.GOOGLE_DRIVE_PICKER_APP_ID;
// Matrix
export const MATRIX_PUBLIC_URI: string | undefined = env.MATRIX_PUBLIC_URI;
export const MATRIX_API_URI: string | undefined = env.MATRIX_API_URI;
export const MATRIX_ADMIN_USER: string | undefined = env.MATRIX_ADMIN_USER;
export const MATRIX_ADMIN_PASSWORD: string | undefined = env.MATRIX_ADMIN_PASSWORD;
export const MATRIX_DOMAIN: string | undefined = env.MATRIX_DOMAIN;

export const ENABLE_SAY: boolean = env.ENABLE_SAY || true;
// Front container:
export const FRONT_ENVIRONMENT_VARIABLES: FrontConfigurationInterface = {
    DEBUG_MODE: env.DEBUG_MODE,
    PUSHER_URL,
    FRONT_URL,
    ADMIN_URL,
    ADMIN_BO_URL,
    UPLOADER_URL: env.UPLOADER_URL,
    ICON_URL: env.ICON_URL,
    STUN_SERVER: env.STUN_SERVER,
    TURN_SERVER: env.TURN_SERVER,
    SKIP_RENDER_OPTIMIZATIONS: env.SKIP_RENDER_OPTIMIZATIONS,
    DISABLE_NOTIFICATIONS: env.DISABLE_NOTIFICATIONS,
    TURN_USER: env.TURN_USER,
    TURN_PASSWORD: env.TURN_PASSWORD,
    JITSI_URL: env.JITSI_URL,
    JITSI_PRIVATE_MODE: env.JITSI_PRIVATE_MODE,
    ENABLE_MAP_EDITOR: env.ENABLE_MAP_EDITOR,
    PUBLIC_MAP_STORAGE_PREFIX: env.PUBLIC_MAP_STORAGE_URL ? new URL(env.PUBLIC_MAP_STORAGE_URL).pathname : undefined,
    MAX_USERNAME_LENGTH: env.MAX_USERNAME_LENGTH,
    MAX_PER_GROUP: env.MAX_PER_GROUP,
    MAX_DISPLAYED_VIDEOS: env.MAX_DISPLAYED_VIDEOS,
    NODE_ENV: env.NODE_ENV || "development",
    CONTACT_URL: env.CONTACT_URL,
    POSTHOG_API_KEY: env.POSTHOG_API_KEY,
    POSTHOG_URL: env.POSTHOG_URL,
    DISABLE_ANONYMOUS,
    ENABLE_OPENID: !!env.OPID_CLIENT_ID,
    OPID_PROFILE_SCREEN_PROVIDER: env.OPID_PROFILE_SCREEN_PROVIDER,
    OPID_WOKA_NAME_POLICY,
    ENABLE_CHAT_UPLOAD,
    FALLBACK_LOCALE,
    ENABLE_REPORT_ISSUES_MENU: env.ENABLE_REPORT_ISSUES_MENU,
    REPORT_ISSUES_URL: env.REPORT_ISSUES_URL,
    SENTRY_DSN_FRONT: env.SENTRY_DSN_FRONT,
    SENTRY_DSN_PUSHER: env.SENTRY_DSN_PUSHER,
    SENTRY_ENVIRONMENT: env.SENTRY_ENVIRONMENT,
    SENTRY_RELEASE: env.SENTRY_RELEASE,
    SENTRY_TRACES_SAMPLE_RATE: env.SENTRY_TRACES_SAMPLE_RATE,
    WOKA_SPEED: env.WOKA_SPEED,
    JITSI_DOMAIN: env.JITSI_DOMAIN,
    JITSI_XMPP_DOMAIN: env.JITSI_XMPP_DOMAIN,
    JITSI_MUC_DOMAIN: env.JITSI_MUC_DOMAIN,
    FEATURE_FLAG_BROADCAST_AREAS: env.FEATURE_FLAG_BROADCAST_AREAS,
    KLAXOON_ENABLED: env.KLAXOON_ENABLED,
    KLAXOON_CLIENT_ID: env.KLAXOON_CLIENT_ID,
    YOUTUBE_ENABLED: env.YOUTUBE_ENABLED,
    GOOGLE_DRIVE_ENABLED: env.GOOGLE_DRIVE_ENABLED,
    GOOGLE_DOCS_ENABLED: env.GOOGLE_DOCS_ENABLED,
    GOOGLE_SHEETS_ENABLED: env.GOOGLE_SHEETS_ENABLED,
    GOOGLE_SLIDES_ENABLED: env.GOOGLE_SLIDES_ENABLED,
    ERASER_ENABLED: env.ERASER_ENABLED,
    EXCALIDRAW_ENABLED: env.EXCALIDRAW_ENABLED,
    EXCALIDRAW_DOMAINS: env.EXCALIDRAW_DOMAINS,
    CARDS_ENABLED: env.CARDS_ENABLED,
    PEER_VIDEO_LOW_BANDWIDTH: parseInt(env.PEER_VIDEO_LOW_BANDWIDTH || "150"),
    PEER_VIDEO_RECOMMENDED_BANDWIDTH: parseInt(env.PEER_VIDEO_RECOMMENDED_BANDWIDTH || "600"),
    PEER_SCREEN_SHARE_LOW_BANDWIDTH: parseInt(env.PEER_SCREEN_SHARE_LOW_BANDWIDTH || "250"),
    PEER_SCREEN_SHARE_RECOMMENDED_BANDWIDTH: parseInt(env.PEER_SCREEN_SHARE_RECOMMENDED_BANDWIDTH || "1000"),
    GOOGLE_DRIVE_PICKER_CLIENT_ID: env.GOOGLE_DRIVE_PICKER_CLIENT_ID,
    GOOGLE_DRIVE_PICKER_APP_ID: env.GOOGLE_DRIVE_PICKER_APP_ID,
    EMBEDLY_KEY: env.EMBEDLY_KEY,
    MATRIX_PUBLIC_URI,
    ENABLE_CHAT,
    ENABLE_CHAT_ONLINE_LIST,
    ENABLE_CHAT_DISCONNECTED_LIST,
    MATRIX_ADMIN_USER,
    MATRIX_DOMAIN,
    ENABLE_SAY: env.ENABLE_SAY || true,
    GRPC_MAX_MESSAGE_SIZE: env.GRPC_MAX_MESSAGE_SIZE,
};
export const GRPC_MAX_MESSAGE_SIZE = env.GRPC_MAX_MESSAGE_SIZE;
