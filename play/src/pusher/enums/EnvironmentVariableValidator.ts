import { OpidWokaNamePolicy } from "@workadventure/messages";
import { z } from "zod";
import {
    AbsoluteOrRelativeUrl,
    BoolAsString,
    emptyStringToUndefined,
    PositiveIntAsString,
    toArray,
    toBool,
    toNumber,
} from "@workadventure/shared-utils/src/EnvironmentVariables/EnvironmentVariableUtils";

export const EnvironmentVariables = z.object({
    // Pusher related environment variables
    SECRET_KEY: z
        .string()
        .min(1)
        .describe("Secret key used to encode JWT tokens. Set this to a random unguessable string."),
    API_URL: z.string().min(1).describe("URL of the back server API"),
    ADMIN_API_URL: AbsoluteOrRelativeUrl.optional().describe(
        "The URL to the admin API. If in the same network, you can use a local name here."
    ),
    ADMIN_URL: AbsoluteOrRelativeUrl.optional().describe(
        "The URL to the admin. This should be a publicly accessible URL."
    ),
    ADMIN_BO_URL: AbsoluteOrRelativeUrl.optional().describe(
        "The URL to the admin dashboard. Will be used to redirect the user to the admin dashboard. You can put it a URL that will automatically connect the user."
    ),
    ADMIN_API_TOKEN: z.string().optional().describe("Authentication token for the admin API"),
    AUTOLOGIN_URL: AbsoluteOrRelativeUrl.optional().describe(
        "The URL to be used to automatically log someone given a token."
    ),
    ADMIN_SOCKETS_TOKEN: z
        .string()
        .optional()
        .describe(
            "Authentication token to connect to 'play' admin websocket endpoint. This endpoint is typically used to list users connected to a given room."
        ),
    CPU_OVERHEAT_THRESHOLD: PositiveIntAsString.optional()
        .transform((val) => toNumber(val, 80))
        .describe("CPU usage threshold (in %) that triggers performance warnings. Defaults to 80"),
    PUSHER_HTTP_PORT: PositiveIntAsString.optional()
        .transform((val) => toNumber(val, 3000))
        .describe("HTTP port for the pusher service. Defaults to 3000"),
    PUSHER_WS_PORT: PositiveIntAsString.optional()
        .transform((val) => toNumber(val, 3001))
        .describe("WebSocket port for the pusher service. Defaults to 3001"),
    SOCKET_IDLE_TIMER: PositiveIntAsString.optional()
        .transform((val) => toNumber(val, 120))
        .describe(
            "maximum time (in second) without activity before a socket is closed. Should be greater than 60 seconds in order to cope for Chrome intensive throttling (https://developer.chrome.com/blog/timer-throttling-in-chrome-88/#intensive-throttling)"
        ),
    // Used only in development
    VITE_URL: z.string().url().optional().describe("URL of the Vite development server (development only)"),
    // Use "*" to allow any domain
    ALLOWED_CORS_ORIGIN: z
        .string()
        .url()
        .or(z.literal("*"))
        .optional()
        .describe("Allowed CORS origin for API requests. Use '*' to allow any domain"),
    PUSHER_URL: AbsoluteOrRelativeUrl.optional().describe("Public URL of the pusher service"),
    FRONT_URL: AbsoluteOrRelativeUrl.optional().describe("Public URL of the frontend application"),
    MAP_STORAGE_API_TOKEN: z.string().describe("API token for authenticating with the map-storage service"),
    PUBLIC_MAP_STORAGE_URL: z
        .string()
        .url()
        .optional()
        .transform(emptyStringToUndefined)
        .describe('The public URL to the map-storage server (for instance: "https://map-storage.example.com")'),
    INTERNAL_MAP_STORAGE_URL: AbsoluteOrRelativeUrl.optional()
        .transform(emptyStringToUndefined)
        .describe('The internal URL to the map-storage server (for instance: "https://map-storage:3000")'),

    OPID_CLIENT_ID: z
        .string()
        .optional()
        .transform((val) => {
            if (val !== null && val !== undefined) {
                console.warn("Using OPID_CLIENT_ID is deprecated. Please use OPENID_CLIENT_ID instead.");
            }
            return val;
        }),
    OPID_CLIENT_SECRET: z
        .string()
        .optional()
        .transform((val) => {
            if (val !== null && val !== undefined) {
                console.warn("Using OPID_CLIENT_SECRET is deprecated. Please use OPENID_CLIENT_SECRET instead.");
            }
            return val;
        }),
    OPID_CLIENT_ISSUER: z
        .string()
        .optional()
        .transform((val) => {
            if (val !== null && val !== undefined) {
                console.warn("Using OPID_CLIENT_ISSUER is deprecated. Please use OPENID_CLIENT_ISSUER instead.");
            }
            return val;
        }),
    OPID_CLIENT_REDIRECT_URL: z
        .string()
        .optional()
        .transform((val) => {
            if (val !== null && val !== undefined) {
                console.warn(
                    "Using OPID_CLIENT_REDIRECT_URL is deprecated. Please use OPENID_CLIENT_REDIRECT_URL instead."
                );
            }
            return val;
        }),
    OPID_CLIENT_REDIRECT_LOGOUT_URL: z
        .string()
        .optional()
        .transform((val) => {
            if (val !== null && val !== undefined) {
                console.warn(
                    "Using OPID_CLIENT_REDIRECT_LOGOUT_URL is deprecated. Please use OPENID_CLIENT_REDIRECT_LOGOUT_URL instead."
                );
            }
            return val;
        }),
    OPID_PROFILE_SCREEN_PROVIDER: z
        .string()
        .optional()
        .transform((val) => {
            if (val !== null && val !== undefined) {
                console.warn(
                    "Using OPID_PROFILE_SCREEN_PROVIDER is deprecated. Please use OPENID_PROFILE_SCREEN_PROVIDER instead."
                );
            }
            return val;
        }),
    OPID_SCOPE: z
        .string()
        .optional()
        .transform((val) => {
            if (val !== null && val !== undefined) {
                console.warn("Using OPID_SCOPE is deprecated. Please use OPENID_SCOPE instead.");
            }
            return val;
        }),
    OPID_PROMPT: z
        .string()
        .optional()
        .transform((val) => {
            if (val !== null && val !== undefined) {
                console.warn("Using OPID_PROMPT is deprecated. Please use OPENID_PROMPT instead.");
            }
            return val;
        }),
    OPID_USERNAME_CLAIM: z
        .string()
        .optional()
        .transform((val) => {
            if (val !== null && val !== undefined) {
                console.warn("Using OPID_USERNAME_CLAIM is deprecated. Please use OPENID_USERNAME_CLAIM instead.");
            }
            return val;
        }),
    OPID_LOCALE_CLAIM: z
        .string()
        .optional()
        .transform((val) => {
            if (val !== null && val !== undefined) {
                console.warn("Using OPID_LOCALE_CLAIM is deprecated. Please use OPENID_LOCALE_CLAIM instead.");
            }
            return val;
        }),
    OPID_WOKA_NAME_POLICY: OpidWokaNamePolicy.optional().transform((val) => {
        if (val !== null && val !== undefined) {
            console.warn("Using OPID_WOKA_NAME_POLICY is deprecated. Please use OPENID_WOKA_NAME_POLICY instead.");
        }
        return val;
    }),
    OPID_TAGS_CLAIM: z
        .string()
        .optional()
        .transform((val) => {
            if (val !== null && val !== undefined) {
                console.warn("Using OPID_TAGS_CLAIM is deprecated. Please use OPENID_TAGS_CLAIM instead.");
            }
            return val;
        }),

    // New OPENID variables (replacing deprecated OPID_ variables)
    OPENID_CLIENT_ID: z.string().optional().describe("OAuth2 client ID for OpenID Connect authentication"),
    OPENID_CLIENT_SECRET: z.string().optional().describe("OAuth2 client secret for OpenID Connect authentication"),
    OPENID_CLIENT_ISSUER: z.string().optional().describe("OpenID Connect issuer URL (identity provider)"),
    OPENID_CLIENT_REDIRECT_URL: z.string().optional().describe("OAuth2 redirect URL after successful authentication"),
    OPENID_CLIENT_REDIRECT_LOGOUT_URL: z.string().optional().describe("Redirect URL after user logout"),
    OPENID_PROFILE_SCREEN_PROVIDER: z
        .string()
        .optional()
        .describe("URL of the 'profile' page (typically part of the optionnal Admin component)"),
    OPENID_SCOPE: z
        .string()
        .optional()
        .describe("OAuth2 scopes to request (space-separated). Defaults to 'openid email profile'"),
    OPENID_PROMPT: z.string().optional().describe("OpenID Connect prompt parameter (e.g., 'login', 'consent')"),
    OPENID_USERNAME_CLAIM: z
        .string()
        .optional()
        .describe("JWT claim to use as the username. Defaults to 'preferred_username'"),
    OPENID_LOCALE_CLAIM: z.string().optional().describe("JWT claim to use for user locale. Defaults to 'locale'"),
    OPENID_WOKA_NAME_POLICY: OpidWokaNamePolicy.optional().describe(
        "Policy for avatar naming: 'user_input' or 'openid_nickname'"
    ),
    OPENID_TAGS_CLAIM: z.string().optional().describe("JWT claim containing user tags/roles"),

    DISABLE_ANONYMOUS: BoolAsString.optional()
        .transform((val) => toBool(val, false))
        .describe("If true, anonymous users cannot access the platform. Defaults to false"),
    PROMETHEUS_AUTHORIZATION_TOKEN: z.string().optional().describe("The token to access the Prometheus metrics."),
    PROMETHEUS_PORT: PositiveIntAsString.optional()
        .transform((val) => toNumber(val, 0))
        .describe(
            "The port to access the Prometheus metrics. If not set, the default port is used AND an authorization token is required."
        ),
    ENABLE_CHAT: BoolAsString.optional()
        .transform((val) => toBool(val, true))
        .describe("Enable/disable the chat feature. Defaults to true"),
    ENABLE_CHAT_UPLOAD: BoolAsString.optional()
        .transform((val) => toBool(val, true))
        .describe("Enable/disable file upload in chat. Defaults to true"),
    ENABLE_CHAT_ONLINE_LIST: BoolAsString.optional()
        .transform((val) => toBool(val, true))
        .describe("Enable/disable online users list in chat. Defaults to true"),
    ENABLE_CHAT_DISCONNECTED_LIST: BoolAsString.optional()
        .transform((val) => toBool(val, true))
        .describe("Enable/disable offline users list in chat. Defaults to true"),
    ENABLE_SAY: BoolAsString.optional()
        .transform((val) => toBool(val, true))
        .describe("Whether the users can communicate via comics-style bubbles."),
    ENABLE_ISSUE_REPORT: BoolAsString.optional()
        .transform((val) => toBool(val, true))
        .describe("Whether the feature 'issue report' is enabled or not on this room. Defaults to true."),
    //DEBUG_ERROR_MESSAGES: BoolAsString.optional().transform((val) => toBool(val, false)),
    ENABLE_OPENAPI_ENDPOINT: BoolAsString.optional()
        .transform((val) => toBool(val, false))
        .describe("Enable/disable the OpenAPI documentation endpoint. Defaults to false"),
    START_ROOM_URL: z.string().optional().describe("Default room URL where users start when accessing the platform"),

    // Front related environment variables
    DEBUG_MODE: BoolAsString.optional()
        .transform((val) => toBool(val, false))
        .describe("Enable debug mode with additional console logging. Defaults to false"),
    UPLOADER_URL: AbsoluteOrRelativeUrl.describe("URL of the file uploader service"),
    ICON_URL: AbsoluteOrRelativeUrl.describe("Base URL for icon resources"),
    STUN_SERVER: z
        .string()
        .optional()
        .describe("Comma separated list of STUN server URLs for WebRTC NAT traversal (format: 'stun:hostname:port')"),
    TURN_SERVER: z
        .string()
        .optional()
        .describe("Comma separated list of TURN server URLs for WebRTC relay (format: 'turn:hostname:port')"),
    SKIP_RENDER_OPTIMIZATIONS: BoolAsString.optional()
        .transform((val) => toBool(val, false))
        .describe("Skip rendering optimizations (useful for debugging). Defaults to false"),
    DISABLE_NOTIFICATIONS: BoolAsString.optional()
        .transform((val) => toBool(val, false))
        .describe("Disable browser notifications. Defaults to false"),
    TURN_USER: z.string().optional().describe("Username for TURN server authentication"),
    TURN_PASSWORD: z.string().optional().describe("Password for TURN server authentication"),
    TURN_STATIC_AUTH_SECRET: z
        .string()
        .optional()
        .transform(emptyStringToUndefined)
        .describe(
            "The auth secret to generate TURN credentials on the fly (enabled by the --use-auth-secret and --auth-secret in Coturn)."
        ),
    TURN_CREDENTIALS_RENEWAL_TIME: PositiveIntAsString.optional()
        .transform((val) => toNumber(val, 3 * 60 * 60 * 1000))
        .describe(
            "Time interval (in milliseconds) for renewing TURN server credentials. Defaults to 10800000 milliseconds (3 hours)"
        ),
    JITSI_URL: z.string().optional().describe("URL of the Jitsi Meet server for video conferencing"),
    JITSI_PRIVATE_MODE: BoolAsString.optional()
        .transform((val) => toBool(val, false))
        .describe("If true, Jitsi rooms are private and require authentication. Defaults to false"),
    MAX_USERNAME_LENGTH: PositiveIntAsString.optional()
        .transform((val) => toNumber(val, 10))
        .describe("Maximum allowed length for usernames. Defaults to 10"),
    MAX_PER_GROUP: PositiveIntAsString.optional()
        .transform((val) => toNumber(val, 4))
        .describe("Maximum number of users in a bubble/group. Defaults to 4"),
    MAX_DISPLAYED_VIDEOS: PositiveIntAsString.optional()
        .transform((val) => toNumber(val, 16))
        .describe(
            "An approximation of the maximum number of videos displayed at once. If there are more videos to display, the user will have to scroll. The number of videos can sometimes be slightly greater (MAX_DISPLAYED_VIDEOS + number of videos to display % number of videos per row). This is useful to avoid overloading the Livekit server when a lot of people are in the same room."
        ),
    NODE_ENV: z.string().optional().describe("Node.js environment: 'development', 'production', or 'test'"),
    CONTACT_URL: AbsoluteOrRelativeUrl.optional().describe("URL for users to contact support or administrators"),
    POSTHOG_API_KEY: z.string().optional().describe("PostHog API key for analytics tracking"),
    POSTHOG_URL: z
        .string()
        .url()
        .optional()
        .or(z.literal(""))
        .describe("PostHog server URL for analytics. Defaults to PostHog cloud"),
    FALLBACK_LOCALE: z
        .string()
        .optional()
        .describe("Default locale/language code when user's locale is not available (e.g., 'en', 'fr')"),
    ENABLE_REPORT_ISSUES_MENU: BoolAsString.optional()
        .transform((val) => toBool(val, false))
        .describe("Enable the 'Report Issues' menu option. Defaults to false"),
    REPORT_ISSUES_URL: z
        .string()
        .url()
        .optional()
        .or(z.literal(""))
        .describe("URL where users can report issues (e.g., GitHub issues, support portal)"),
    LOGROCKET_ID: z.string().optional().describe("LogRocket application ID for session recording and monitoring"),
    SENTRY_DSN_FRONT: z.string().optional().describe("Sentry DSN for frontend error tracking"),
    SENTRY_DSN_PUSHER: z.string().optional().describe("Sentry DSN for pusher service error tracking"),
    SENTRY_RELEASE: z.string().optional().describe("Sentry release version identifier for error tracking"),
    SENTRY_ENVIRONMENT: z
        .string()
        .optional()
        .describe("Sentry environment name (e.g., 'production', 'staging', 'development')"),
    SENTRY_TRACES_SAMPLE_RATE: z
        .string()
        .optional()
        .transform((val) => toNumber(val, 0.1))
        .describe("The sampling rate for Sentry traces. Only used if SENTRY_DSN is configured. Defaults to 0.1"),

    // RoomAPI related environment variables
    ROOM_API_PORT: PositiveIntAsString.optional()
        .transform((val) => toNumber(val, 50051))
        .describe("Port for the Room API gRPC server. Defaults to 50051"),
    ROOM_API_SECRET_KEY: z.string().optional().describe("Secret key for Room API authentication"),

    // Map editor related environment variables
    ENABLE_MAP_EDITOR: BoolAsString.optional()
        .transform((val) => toBool(val, false))
        .describe("Enable the built-in map editor. Defaults to false"),
    MAP_EDITOR_ALLOWED_USERS: z
        .string()
        .optional()
        .transform((val) => toArray(val))
        .describe("Comma-separated list of user IDs allowed to edit maps"),
    MAP_EDITOR_ALLOW_ALL_USERS: BoolAsString.optional()
        .transform((val) => toBool(val, true))
        .describe(
            'If set to true, all users can edit the map. If set to false, only the users in MAP_EDITOR_ALLOWED_USERS or users with the "admin" or "editor" tag can edit the map. Note: this setting is ignored if an Admin API is configured.'
        ),
    WOKA_SPEED: PositiveIntAsString.optional()
        .transform((val) => toNumber(val, 9))
        .describe("Avatar (WOKA) movement speed. Defaults to 9"),
    FEATURE_FLAG_BROADCAST_AREAS: BoolAsString.optional()
        .transform((val) => toBool(val, false))
        .describe("Enable broadcast areas feature. Defaults to false"),

    KLAXOON_ENABLED: BoolAsString.optional()
        .transform((val) => toBool(val, false))
        .describe("Enable Klaxoon embedded application integration. Defaults to false"),
    KLAXOON_CLIENT_ID: z.string().optional().describe("Klaxoon OAuth2 client ID"),
    YOUTUBE_ENABLED: BoolAsString.optional()
        .transform((val) => toBool(val, false))
        .describe("Enable YouTube map editor tool. Defaults to false"),
    GOOGLE_DRIVE_ENABLED: BoolAsString.optional()
        .transform((val) => toBool(val, false))
        .describe("Enable Google Drive map editor tool. Defaults to false"),
    GOOGLE_DOCS_ENABLED: BoolAsString.optional()
        .transform((val) => toBool(val, false))
        .describe("Enable Google Docs map editor tool. Defaults to false"),
    GOOGLE_SHEETS_ENABLED: BoolAsString.optional()
        .transform((val) => toBool(val, false))
        .describe("Enable Google Sheets map editor tool. Defaults to false"),
    GOOGLE_SLIDES_ENABLED: BoolAsString.optional()
        .transform((val) => toBool(val, false))
        .describe("Enable Google Slides map editor tool. Defaults to false"),
    ERASER_ENABLED: BoolAsString.optional()
        .transform((val) => toBool(val, false))
        .describe("Enable Eraser.io embedded whiteboard. Defaults to false"),
    EXCALIDRAW_ENABLED: BoolAsString.optional()
        .transform((val) => toBool(val, false))
        .describe("Enable Excalidraw embedded whiteboard. Defaults to false"),
    EXCALIDRAW_DOMAINS: z
        .string()
        .optional()
        .transform((val) => toArray(val))
        .describe("Comma-separated list of allowed Excalidraw domains"),
    EMBEDDED_DOMAINS_WHITELIST: z
        .string()
        .optional()
        .transform((val) => toArray(val))
        .describe("Comma-separated list of domains allowed for embedded iframes"),
    CARDS_ENABLED: BoolAsString.optional()
        .transform((val) => toBool(val, false))
        .describe("Enable Cards embedded application. Defaults to false"),
    TLDRAW_ENABLED: BoolAsString.optional()
        .transform((val) => toBool(val, false))
        .describe("Enable tldraw embedded whiteboard. Defaults to false"),

    // Limit bandwidth environment variables
    PEER_VIDEO_LOW_BANDWIDTH: PositiveIntAsString.optional().describe(
        "Low bandwidth threshold for peer video (in kbps)"
    ),
    PEER_VIDEO_RECOMMENDED_BANDWIDTH: PositiveIntAsString.optional().describe(
        "Recommended bandwidth for peer video (in kbps)"
    ),
    PEER_SCREEN_SHARE_LOW_BANDWIDTH: PositiveIntAsString.optional().describe(
        "Low bandwidth threshold for screen sharing (in kbps)"
    ),
    PEER_SCREEN_SHARE_RECOMMENDED_BANDWIDTH: PositiveIntAsString.optional().describe(
        "Recommended bandwidth for screen sharing (in kbps)"
    ),
    // Google drive ouath for picker
    GOOGLE_DRIVE_PICKER_CLIENT_ID: z.string().optional().describe("Google OAuth2 client ID for Drive Picker"),
    GOOGLE_DRIVE_PICKER_API_KEY: z.string().optional().describe("Google API key for Drive Picker"),
    GOOGLE_DRIVE_PICKER_APP_ID: z.string().optional().describe("Google application ID for Drive Picker"),
    MATRIX_API_URI: z.string().optional().describe("Matrix homeserver API URI (internal)"),
    MATRIX_PUBLIC_URI: z.string().optional().describe("Matrix homeserver public URI"),
    MATRIX_ADMIN_USER: z.string().optional().describe("Matrix administrator username"),
    MATRIX_ADMIN_PASSWORD: z.string().optional().describe("Matrix administrator password"),
    MATRIX_DOMAIN: z.string().optional().describe("Matrix server domain"),
    EMBEDLY_KEY: z.string().optional().describe("Embedly API key for rich link previews"),
    GRPC_MAX_MESSAGE_SIZE: PositiveIntAsString.optional()
        .or(z.string().max(0))
        .transform((val) => toNumber(val, 20 * 1024 * 1024)) // Default to 20 MB
        .describe("The maximum size of a gRPC message. Defaults to 20 MB."),
    BACKGROUND_TRANSFORMER_ENGINE: z
        .enum(["tasks-vision", "selfie-segmentation", ""])
        .optional()
        .describe(
            "Virtual background transformer engine: 'tasks-vision' (GPU-accelerated, experimental) or 'selfie-segmentation' (CPU-based, stable). Currently defaults to 'selfie-segmentation'; 'tasks-vision' is intended as the future default once considered stable."
        ),
});

export type EnvironmentVariables = z.infer<typeof EnvironmentVariables>;
