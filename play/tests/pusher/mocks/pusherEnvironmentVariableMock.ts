import type { OpidWokaNamePolicy } from "@workadventure/messages";
import type { FrontConfigurationInterface } from "../../../src/common/FrontConfigurationInterface";

/**
 * Full stub of `src/pusher/enums/EnvironmentVariable` for tests that load SocketManager (and its dependency graph)
 * without executing real env validation or `process.exit`.
 */
export const SECRET_KEY = "test-secret-key";
export const API_URL = "http://api.test";
export const ADMIN_API_URL: string | undefined = undefined;
export const ADMIN_API_RETRY_DELAY = 500;
export const ADMIN_URL: string | undefined = undefined;
export const ADMIN_BO_URL: string | undefined = undefined;
export const AUTOLOGIN_URL = "http://admin.test/workadventure/login";
export const ADMIN_API_TOKEN: string | undefined = undefined;
export const MAP_STORAGE_API_TOKEN = "test-map-storage-token";
export const ADMIN_SOCKETS_TOKEN: string | undefined = undefined;
export const CPU_OVERHEAT_THRESHOLD = 80;
export const PUSHER_HTTP_PORT = 3000;
export const PUSHER_WS_PORT = 3001;
export const SOCKET_IDLE_TIMER = 120;
export const ALLOWED_CORS_ORIGIN: string | undefined = undefined;
export const PUSHER_URL = "http://pusher.test";
export const FRONT_URL = "http://front.test";
export const VITE_URL = "http://front.test";
export const PUBLIC_MAP_STORAGE_URL = "";
export const INTERNAL_MAP_STORAGE_URL: string | undefined = undefined;
export const REDIS_HOST: string | undefined = undefined;
export const REDIS_PORT = 6379;
export const REDIS_PASSWORD: string | undefined = undefined;
export const OPID_CLIENT_ID = "";
export const OPID_CLIENT_SECRET = "";
export const OPID_CLIENT_ISSUER = "";
export const OPID_CLIENT_REDIRECT_URL = `${PUSHER_URL}/openid-callback`;
export const OPID_CLIENT_REDIRECT_LOGOUT_URL = `${PUSHER_URL}/logout-callback`;
export const OPID_PROFILE_SCREEN_PROVIDER: string | undefined = undefined;
export const OPID_SCOPE = "openid email profile ";
export const OPID_PROMPT: string | undefined = undefined;
export const OPID_USERNAME_CLAIM = "username";
export const OPID_LOCALE_CLAIM = "locale";
export const OPID_WOKA_NAME_POLICY: OpidWokaNamePolicy = "user_input";
export const OPID_TAGS_CLAIM = "tags";
export const DISABLE_ANONYMOUS = false;
export const PROMETHEUS_AUTHORIZATION_TOKEN: string | undefined = undefined;
export const PROMETHEUS_PORT = 0;
export const ENABLE_CHAT = true;
export const ENABLE_CHAT_UPLOAD = true;
export const ENABLE_CHAT_ONLINE_LIST = true;
export const ENABLE_CHAT_DISCONNECTED_LIST = true;
export const DEFAULT_WOKA_NAME = "";
export const DEFAULT_WOKA_TEXTURE = "";
export const SKIP_CAMERA_PAGE = false;
export const BYPASS_PWA = false;
export const PROVIDE_DEFAULT_WOKA_NAME: "no" | "random" | "fix" | "fix-plus-random-numbers" | undefined = undefined;
export const PROVIDE_DEFAULT_WOKA_TEXTURE: "no" | "random" | "fix" | undefined = undefined;
export const ENABLE_OPENAPI_ENDPOINT = false;
export const START_ROOM_URL = "/_/global/maps.workadventu.re/starter/map.json";
export const FALLBACK_LOCALE: string | undefined = "en";
export const LOGROCKET_ID: string | undefined = undefined;
export const SENTRY_DSN: string | undefined = undefined;
export const SENTRY_ENVIRONMENT: string | undefined = undefined;
export const SENTRY_RELEASE: string | undefined = undefined;
export const SENTRY_TRACES_SAMPLE_RATE: number | undefined = undefined;
export const STUN_SERVER: string | undefined = undefined;
export const TURN_SERVER: string | undefined = undefined;
export const TURN_USER: string | undefined = undefined;
export const TURN_PASSWORD: string | undefined = undefined;
export const TURN_STATIC_AUTH_SECRET: string | undefined = undefined;
export const TURN_CREDENTIALS_RENEWAL_TIME = 10_800_000;
export const ROOM_API_PORT = 50_051;
export const ROOM_API_SECRET_KEY: string | undefined = undefined;
export const ENABLE_MAP_EDITOR = false;
export const MAP_EDITOR_ALLOWED_USERS: string[] = [];
export const MAP_EDITOR_ALLOW_ALL_USERS = true;
export const KLAXOON_ENABLED = false;
export const KLAXOON_CLIENT_ID: string | undefined = undefined;
export const YOUTUBE_ENABLED = false;
export const GOOGLE_DRIVE_ENABLED = false;
export const GOOGLE_DOCS_ENABLED = false;
export const GOOGLE_SHEETS_ENABLED = false;
export const GOOGLE_SLIDES_ENABLED = false;
export const ERASER_ENABLED = false;
export const EXCALIDRAW_ENABLED = false;
export const EXCALIDRAW_DOMAINS: string[] = [];
export const EMBEDDED_DOMAINS_WHITELIST: string[] = [];
export const CARDS_ENABLED = false;
export const TLDRAW_ENABLED = false;
export const GOOGLE_DRIVE_PICKER_CLIENT_ID: string | undefined = undefined;
export const GOOGLE_DRIVE_PICKER_API_KEY: string | undefined = undefined;
export const GOOGLE_DRIVE_PICKER_APP_ID: string | undefined = undefined;
export const MATRIX_PUBLIC_URI: string | undefined = undefined;
export const MATRIX_API_URI: string | undefined = undefined;
export const MATRIX_ADMIN_USER = "test-matrix-user";
export const MATRIX_ADMIN_PASSWORD = "test-matrix-password";
export const MATRIX_DOMAIN = "matrix.test";
export const ENABLE_SAY = true;
export const LIVEKIT_RECORDING_S3_ENDPOINT: string | undefined = undefined;
export const LIVEKIT_RECORDING_S3_CDN_ENDPOINT: string | undefined = undefined;
export const LIVEKIT_RECORDING_S3_ACCESS_KEY: string | undefined = undefined;
export const LIVEKIT_RECORDING_S3_SECRET_KEY: string | undefined = undefined;
export const LIVEKIT_RECORDING_S3_BUCKET: string | undefined = undefined;
export const LIVEKIT_RECORDING_S3_REGION: string | undefined = undefined;
export const LIVEKIT_PIXEL_DENSITY = 2 / 3;
export const ENABLE_ISSUE_REPORT = true;
export const ENABLE_TUTORIAL = true;
export const GRPC_MAX_MESSAGE_SIZE = 20 * 1024 * 1024;
export const LIVEKIT_API_KEY: string | undefined = undefined;
export const LIVEKIT_API_SECRET: string | undefined = undefined;

export const FRONT_ENVIRONMENT_VARIABLES: FrontConfigurationInterface = {
    DEBUG_MODE: false,
    PUSHER_URL,
    FRONT_URL,
    ADMIN_URL,
    UPLOADER_URL: "http://uploader.test",
    ICON_URL: "http://icon.test",
    SKIP_RENDER_OPTIMIZATIONS: false,
    DISABLE_NOTIFICATIONS: false,
    JITSI_URL: undefined,
    JITSI_PRIVATE_MODE: false,
    ENABLE_MAP_EDITOR,
    PUBLIC_MAP_STORAGE_PREFIX: undefined,
    MAX_USERNAME_LENGTH: 10,
    MAX_PER_GROUP: 4,
    MAX_DISPLAYED_VIDEOS: 16,
    LIVEKIT_PIXEL_DENSITY,
    NODE_ENV: "test",
    CONTACT_URL: undefined,
    POSTHOG_API_KEY: undefined,
    POSTHOG_URL: undefined,
    DISABLE_ANONYMOUS,
    ENABLE_OPENID: false,
    OPID_PROFILE_SCREEN_PROVIDER: undefined,
    OPID_WOKA_NAME_POLICY,
    ENABLE_CHAT_UPLOAD,
    FALLBACK_LOCALE,
    ENABLE_REPORT_ISSUES_MENU: false,
    REPORT_ISSUES_URL: undefined,
    SENTRY_DSN_FRONT: undefined,
    SENTRY_DSN_PUSHER: undefined,
    SENTRY_ENVIRONMENT: undefined,
    SENTRY_RELEASE: undefined,
    SENTRY_TRACES_SAMPLE_RATE: undefined,
    WOKA_SPEED: 9,
    FEATURE_FLAG_BROADCAST_AREAS: false,
    KLAXOON_ENABLED,
    KLAXOON_CLIENT_ID,
    YOUTUBE_ENABLED,
    GOOGLE_DRIVE_ENABLED,
    GOOGLE_DOCS_ENABLED,
    GOOGLE_SHEETS_ENABLED,
    GOOGLE_SLIDES_ENABLED,
    ERASER_ENABLED,
    EXCALIDRAW_ENABLED,
    EXCALIDRAW_DOMAINS,
    CARDS_ENABLED,
    TLDRAW_ENABLED,
    MINIMUM_DISTANCE: 64,
    GOOGLE_DRIVE_PICKER_CLIENT_ID,
    GOOGLE_DRIVE_PICKER_APP_ID,
    EMBEDLY_KEY: undefined,
    MATRIX_PUBLIC_URI,
    ENABLE_CHAT,
    ENABLE_CHAT_ONLINE_LIST,
    ENABLE_CHAT_DISCONNECTED_LIST,
    MATRIX_ADMIN_USER,
    MATRIX_DOMAIN,
    ENABLE_SAY,
    ENABLE_ISSUE_REPORT,
    GRPC_MAX_MESSAGE_SIZE,
    TURN_CREDENTIALS_RENEWAL_TIME,
    BACKGROUND_TRANSFORMER_ENGINE: "selfie-segmentation",
    DEFAULT_WOKA_NAME,
    DEFAULT_WOKA_TEXTURE,
    SKIP_CAMERA_PAGE,
    BYPASS_PWA,
    PROVIDE_DEFAULT_WOKA_NAME,
    PROVIDE_DEFAULT_WOKA_TEXTURE,
    ENABLE_TUTORIAL,
};
