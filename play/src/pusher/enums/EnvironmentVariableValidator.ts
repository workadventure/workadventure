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
    SECRET_KEY: z.string().min(1),
    API_URL: z.string().min(1),
    ADMIN_API_URL: AbsoluteOrRelativeUrl.optional().describe(
        "The URL to the admin API. If in the same network, you can use a local name here."
    ),
    ADMIN_URL: AbsoluteOrRelativeUrl.optional().describe(
        "The URL to the admin. This should be a publicly accessible URL."
    ),
    ADMIN_BO_URL: AbsoluteOrRelativeUrl.optional().describe(
        "The URL to the admin dashboard. Will be used to redirect the user to the admin dashboard. You can put it a URL that will automatically connect the user."
    ),
    ADMIN_API_TOKEN: z.string().optional(),
    AUTOLOGIN_URL: AbsoluteOrRelativeUrl.optional().describe(
        "The URL to be used to automatically log someone given a token."
    ),
    ADMIN_SOCKETS_TOKEN: z.string().optional(),
    CPU_OVERHEAT_THRESHOLD: PositiveIntAsString.optional().transform((val) => toNumber(val, 80)),
    PUSHER_HTTP_PORT: PositiveIntAsString.optional().transform((val) => toNumber(val, 3000)),
    PUSHER_WS_PORT: PositiveIntAsString.optional().transform((val) => toNumber(val, 3001)),
    SOCKET_IDLE_TIMER: PositiveIntAsString.optional()
        .transform((val) => toNumber(val, 120))
        .describe(
            "maximum time (in second) without activity before a socket is closed. Should be greater than 60 seconds in order to cope for Chrome intensive throttling (https://developer.chrome.com/blog/timer-throttling-in-chrome-88/#intensive-throttling)"
        ),
    // Used only in development
    VITE_URL: z.string().url().optional(),
    // Use "*" to allow any domain
    ALLOWED_CORS_ORIGIN: z.string().url().or(z.literal("*")).optional(),
    PUSHER_URL: AbsoluteOrRelativeUrl.optional(),
    FRONT_URL: AbsoluteOrRelativeUrl.optional(),
    MAP_STORAGE_API_TOKEN: z.string(),
    PUBLIC_MAP_STORAGE_URL: z
        .string()
        .url()
        .optional()
        .transform(emptyStringToUndefined)
        .describe('The public URL to the map-storage server (for instance: "https://map-storage.example.com"'),
    INTERNAL_MAP_STORAGE_URL: AbsoluteOrRelativeUrl.optional()
        .transform(emptyStringToUndefined)
        .describe('The internal URL to the map-storage server (for instance: "https://map-storage:3000"'),

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
    OPENID_CLIENT_ID: z.string().optional(),
    OPENID_CLIENT_SECRET: z.string().optional(),
    OPENID_CLIENT_ISSUER: z.string().optional(),
    OPENID_CLIENT_REDIRECT_URL: z.string().optional(),
    OPENID_CLIENT_REDIRECT_LOGOUT_URL: z.string().optional(),
    OPENID_PROFILE_SCREEN_PROVIDER: z.string().optional(),
    OPENID_SCOPE: z.string().optional(),
    OPENID_PROMPT: z.string().optional(),
    OPENID_USERNAME_CLAIM: z.string().optional(),
    OPENID_LOCALE_CLAIM: z.string().optional(),
    OPENID_WOKA_NAME_POLICY: OpidWokaNamePolicy.optional(),
    OPENID_TAGS_CLAIM: z.string().optional(),

    USERNAME_POLICY: z.string().optional(),
    DISABLE_ANONYMOUS: BoolAsString.optional().transform((val) => toBool(val, false)),
    PROMETHEUS_AUTHORIZATION_TOKEN: z.string().optional().describe("The token to access the Prometheus metrics."),
    PROMETHEUS_PORT: PositiveIntAsString.optional()
        .transform((val) => toNumber(val, 0))
        .describe(
            "The port to access the Prometheus metrics. If not set, the default port is used AND an authorization token is required."
        ),
    ENABLE_CHAT: BoolAsString.optional().transform((val) => toBool(val, true)),
    ENABLE_CHAT_UPLOAD: BoolAsString.optional().transform((val) => toBool(val, true)),
    ENABLE_CHAT_ONLINE_LIST: BoolAsString.optional().transform((val) => toBool(val, true)),
    ENABLE_CHAT_DISCONNECTED_LIST: BoolAsString.optional().transform((val) => toBool(val, true)),
    ENABLE_SAY: BoolAsString.optional()
        .transform((val) => toBool(val, true))
        .describe("Whether the users can communicate via comics-style bubbles."),
    //DEBUG_ERROR_MESSAGES: BoolAsString.optional().transform((val) => toBool(val, false)),
    ENABLE_OPENAPI_ENDPOINT: BoolAsString.optional().transform((val) => toBool(val, false)),
    START_ROOM_URL: z.string().optional(),

    // Front related environment variables
    DEBUG_MODE: BoolAsString.optional().transform((val) => toBool(val, false)),
    UPLOADER_URL: AbsoluteOrRelativeUrl,
    ICON_URL: AbsoluteOrRelativeUrl,
    STUN_SERVER: z.string().optional(),
    TURN_SERVER: z.string().optional(),
    SKIP_RENDER_OPTIMIZATIONS: BoolAsString.optional().transform((val) => toBool(val, false)),
    DISABLE_NOTIFICATIONS: BoolAsString.optional().transform((val) => toBool(val, false)),
    TURN_USER: z.string().optional(),
    TURN_PASSWORD: z.string().optional(),
    JITSI_URL: z.string().optional(),
    JITSI_PRIVATE_MODE: BoolAsString.optional().transform((val) => toBool(val, false)),
    MAX_USERNAME_LENGTH: PositiveIntAsString.optional().transform((val) => toNumber(val, 10)),
    MAX_PER_GROUP: PositiveIntAsString.optional().transform((val) => toNumber(val, 4)),
    MAX_DISPLAYED_VIDEOS: PositiveIntAsString.optional()
        .transform((val) => toNumber(val, 16))
        .describe(
            "An approximation of the maximum number of videos displayed at once. If there are more videos to display, the user will have to scroll. The number of videos can sometimes be slightly greater (MAX_DISPLAYED_VIDEOS + number of videos to display % number of videos per row). This is useful to avoid overloading the Livekit server when a lot of people are in the same room."
        ),
    NODE_ENV: z.string().optional(),
    CONTACT_URL: AbsoluteOrRelativeUrl.optional(),
    POSTHOG_API_KEY: z.string().optional(),
    POSTHOG_URL: z.string().url().optional().or(z.literal("")),
    FALLBACK_LOCALE: z.string().optional(),
    ENABLE_REPORT_ISSUES_MENU: BoolAsString.optional().transform((val) => toBool(val, false)),
    REPORT_ISSUES_URL: z.string().url().optional().or(z.literal("")),
    LOGROCKET_ID: z.string().optional(),
    SENTRY_DSN_FRONT: z.string().optional(),
    SENTRY_DSN_PUSHER: z.string().optional(),
    SENTRY_RELEASE: z.string().optional(),
    SENTRY_ENVIRONMENT: z.string().optional(),
    SENTRY_TRACES_SAMPLE_RATE: z
        .string()
        .optional()
        .transform((val) => toNumber(val, 0.1))
        .describe("The sampling rate for Sentry traces. Only used if SENTRY_DSN is configured. Defaults to 0.1"),

    // RoomAPI related environment variables
    ROOM_API_PORT: PositiveIntAsString.optional().transform((val) => toNumber(val, 50051)),
    ROOM_API_SECRET_KEY: z.string().optional(),

    // Map editor related environment variables
    ENABLE_MAP_EDITOR: BoolAsString.optional().transform((val) => toBool(val, false)),
    MAP_EDITOR_ALLOWED_USERS: z
        .string()
        .optional()
        .transform((val) => toArray(val)),
    MAP_EDITOR_ALLOW_ALL_USERS: BoolAsString.optional()
        .transform((val) => toBool(val, true))
        .describe(
            'If set to true, all users can edit the map. If set to false, only the users in MAP_EDITOR_ALLOWED_USERS or users with the "admin" or "editor" tag can edit the map. Note: this setting is ignored if an Admin API is configured.'
        ),
    WOKA_SPEED: PositiveIntAsString.optional().transform((val) => toNumber(val, 9)),
    FEATURE_FLAG_BROADCAST_AREAS: BoolAsString.optional().transform((val) => toBool(val, false)),

    // Jitsi related environment variables
    JITSI_DOMAIN: z.string().optional(),
    JITSI_XMPP_DOMAIN: z.string().optional(),
    JITSI_MUC_DOMAIN: z.string().optional(),
    KLAXOON_ENABLED: BoolAsString.optional().transform((val) => toBool(val, false)),
    KLAXOON_CLIENT_ID: z.string().optional(),
    YOUTUBE_ENABLED: BoolAsString.optional().transform((val) => toBool(val, false)),
    GOOGLE_DRIVE_ENABLED: BoolAsString.optional().transform((val) => toBool(val, false)),
    GOOGLE_DOCS_ENABLED: BoolAsString.optional().transform((val) => toBool(val, false)),
    GOOGLE_SHEETS_ENABLED: BoolAsString.optional().transform((val) => toBool(val, false)),
    GOOGLE_SLIDES_ENABLED: BoolAsString.optional().transform((val) => toBool(val, false)),
    ERASER_ENABLED: BoolAsString.optional().transform((val) => toBool(val, false)),
    EXCALIDRAW_ENABLED: BoolAsString.optional().transform((val) => toBool(val, false)),
    EXCALIDRAW_DOMAINS: z
        .string()
        .optional()
        .transform((val) => toArray(val)),
    EMBEDDED_DOMAINS_WHITELIST: z
        .string()
        .optional()
        .transform((val) => toArray(val)),
    CARDS_ENABLED: BoolAsString.optional().transform((val) => toBool(val, false)),

    // Limit bandwidth environment variables
    PEER_VIDEO_LOW_BANDWIDTH: PositiveIntAsString.optional(),
    PEER_VIDEO_RECOMMENDED_BANDWIDTH: PositiveIntAsString.optional(),
    PEER_SCREEN_SHARE_LOW_BANDWIDTH: PositiveIntAsString.optional(),
    PEER_SCREEN_SHARE_RECOMMENDED_BANDWIDTH: PositiveIntAsString.optional(),
    // Google drive ouath for picker
    GOOGLE_DRIVE_PICKER_CLIENT_ID: z.string().optional(),
    GOOGLE_DRIVE_PICKER_API_KEY: z.string().optional(),
    GOOGLE_DRIVE_PICKER_APP_ID: z.string().optional(),
    MATRIX_API_URI: z.string().optional(),
    MATRIX_PUBLIC_URI: z.string().optional(),
    MATRIX_ADMIN_USER: z.string().optional(),
    MATRIX_ADMIN_PASSWORD: z.string().optional(),
    MATRIX_DOMAIN: z.string().optional(),
    EMBEDLY_KEY: z.string().optional(),
    GRPC_MAX_MESSAGE_SIZE: PositiveIntAsString.optional()
        .or(z.string().max(0))
        .transform((val) => toNumber(val, 20 * 1024 * 1024)) // Default to 20 MB
        .describe("The maximum size of a gRPC message. Defaults to 20 MB."),
});

export type EnvironmentVariables = z.infer<typeof EnvironmentVariables>;
