import { OpidWokaNamePolicy } from "@workadventure/messages";
import { z } from "zod";
import {
    AbsoluteOrRelativeUrl,
    BoolAsString,
    PositiveIntAsString,
    toBool,
    toNumber,
} from "@workadventure/shared-utils/src/EnvironmentVariables/EnvironmentVariableUtils";

export const EnvironmentVariables = z.object({
    // Pusher related environment variables
    SECRET_KEY: z.string().min(1),
    API_URL: z.string().min(1),
    ADMIN_API_URL: AbsoluteOrRelativeUrl.optional(),
    ADMIN_URL: AbsoluteOrRelativeUrl.optional(),
    ADMIN_API_TOKEN: z.string().optional(),
    ADMIN_SOCKETS_TOKEN: z.string().optional(),
    CPU_OVERHEAT_THRESHOLD: PositiveIntAsString.optional().transform((val) => toNumber(val, 80)),
    PUSHER_HTTP_PORT: PositiveIntAsString.optional().transform((val) => toNumber(val, 3000)),
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
    PUBLIC_MAP_STORAGE_URL: AbsoluteOrRelativeUrl.optional(),
    OPID_CLIENT_ID: z.string().optional(),
    OPID_CLIENT_SECRET: z.string().optional(),
    OPID_CLIENT_ISSUER: z.string().optional(),
    OPID_PROFILE_SCREEN_PROVIDER: z.string().optional(),
    OPID_SCOPE: z.string().optional(),
    OPID_PROMPT: z.string().optional(),
    OPID_USERNAME_CLAIM: z.string().optional(),
    OPID_LOCALE_CLAIM: z.string().optional(),
    OPID_LOGOUT_REDIRECT_URL: z.string().optional(),
    USERNAME_POLICY: z.string().optional(),
    DISABLE_ANONYMOUS: BoolAsString.optional().transform((val) => toBool(val, false)),
    PROMETHEUS_AUTHORIZATION_TOKEN: z.string().optional(),
    EJABBERD_DOMAIN: z.string().optional(),
    EJABBERD_JWT_SECRET: z.string().optional(),
    ENABLE_CHAT: BoolAsString.optional().transform((val) => toBool(val, true)),
    ENABLE_CHAT_UPLOAD: BoolAsString.optional().transform((val) => toBool(val, true)),
    ENABLE_CHAT_ONLINE_LIST: BoolAsString.optional().transform((val) => toBool(val, true)),
    ENABLE_CHAT_DISCONNECTED_LIST: BoolAsString.optional().transform((val) => toBool(val, true)),
    DEBUG_ERROR_MESSAGES: BoolAsString.optional().transform((val) => toBool(val, false)),
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
    ENABLE_FEATURE_MAP_EDITOR: BoolAsString.optional().transform((val) => toBool(val, false)),
    ENABLE_MAP_EDITOR_AREAS_TOOL: BoolAsString.optional().transform((val) => toBool(val, false)),
    MAX_USERNAME_LENGTH: PositiveIntAsString.optional().transform((val) => toNumber(val, 10)),
    MAX_PER_GROUP: PositiveIntAsString.optional().transform((val) => toNumber(val, 4)),
    NODE_ENV: z.string().optional(),
    CONTACT_URL: AbsoluteOrRelativeUrl.optional(),
    POSTHOG_API_KEY: z.string().optional(),
    POSTHOG_URL: z.string().url().optional().or(z.literal("")),
    FALLBACK_LOCALE: z.string().optional(),
    CHAT_URL: AbsoluteOrRelativeUrl,
    OPID_WOKA_NAME_POLICY: OpidWokaNamePolicy.optional(),
    ENABLE_REPORT_ISSUES_MENU: BoolAsString.optional().transform((val) => toBool(val, false)),
    REPORT_ISSUES_URL: z.string().url().optional().or(z.literal("")),
    LOGROCKET_ID: z.string().optional(),
    SENTRY_DNS: z.string().optional(),
    SENTRY_RELEASE: z.string().optional(),

    // RoomAPI related environment variables
    ROOM_API_PORT: PositiveIntAsString.optional().transform((val) => toNumber(val, 50051)),
    ROOM_API_SECRET_KEY: z.string().optional(),
});

export type EnvironmentVariables = z.infer<typeof EnvironmentVariables>;
