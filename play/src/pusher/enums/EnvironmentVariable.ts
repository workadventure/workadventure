import { z, ZodError } from "zod";
import type { FrontConfigurationInterface } from "../../common/FrontConfigurationInterface";

const BoolAsString = z.union([z.literal("true"), z.literal("false"), z.literal("0"), z.literal("1"), z.literal("")]);
type BoolAsString = z.infer<typeof BoolAsString>;

const PositiveIntAsString = z.string().regex(/^\d*$/, { message: "Must be a positive integer number" });
type PositiveIntAsString = z.infer<typeof PositiveIntAsString>;

const EnvironmentVariables = z.object({
    // Pusher related environment variables
    SECRET_KEY: z.string().min(1),
    API_URL: z.string().min(1),
    ADMIN_API_URL: z.string().url().optional(),
    ADMIN_URL: z.string().url().optional(),
    ADMIN_API_TOKEN: z.string().optional(),
    ADMIN_SOCKETS_TOKEN: z.string().optional(),
    CPU_OVERHEAT_THRESHOLD: PositiveIntAsString.optional(),
    PUSHER_HTTP_PORT: PositiveIntAsString.optional(),
    // Maximum time (in second) without activity before a socket is closed. Should be greater than 60 seconds in order to cope for Chrome intensive throttling (https://developer.chrome.com/blog/timer-throttling-in-chrome-88/#intensive-throttling)
    SOCKET_IDLE_TIMER: PositiveIntAsString.optional(),
    // Used only in development
    VITE_URL: z.string().url().optional(),
    // Use "*" to allow any domain
    ALLOWED_CORS_ORIGIN: z.string().url().optional(),
    PUSHER_URL: z.string().url().optional(),
    PUBLIC_MAP_STORAGE_URL: z.string().url().optional(),
    OPID_CLIENT_ID: z.string().optional(),
    OPID_CLIENT_SECRET: z.string().optional(),
    OPID_CLIENT_ISSUER: z.string().optional(),
    OPID_PROFILE_SCREEN_PROVIDER: z.string().optional(),
    OPID_SCOPE: z.string().optional(),
    OPID_PROMPT: z.string().optional(),
    OPID_USERNAME_CLAIM: z.string().optional(),
    OPID_LOCALE_CLAIM: z.string().optional(),
    DISABLE_ANONYMOUS: BoolAsString.optional(),
    PROMETHEUS_AUTHORIZATION_TOKEN: z.string().optional(),
    EJABBERD_DOMAIN: z.string().optional(),
    EJABBERD_WS_URI: z.string().optional(),
    EJABBERD_JWT_SECRET: z.string().optional(),
    MAX_HISTORY_CHAT: PositiveIntAsString.optional(),
    ENABLE_CHAT: BoolAsString.optional(),
    ENABLE_CHAT_UPLOAD: BoolAsString.optional(),
    DEBUG_ERROR_MESSAGES: BoolAsString.optional(),
    ENABLE_OPENAPI_ENDPOINT: BoolAsString.optional(),
    START_ROOM_URL: z.string().optional(),

    // Front related environment variables
    DEBUG_MODE: BoolAsString.optional(),
    UPLOADER_URL: z.string().url(),
    ICON_URL: z.string().url(),
    STUN_SERVER: z.string().optional(),
    TURN_SERVER: z.string().optional(),
    SKIP_RENDER_OPTIMIZATIONS: BoolAsString.optional(),
    DISABLE_NOTIFICATIONS: BoolAsString.optional(),
    TURN_USER: z.string().optional(),
    TURN_PASSWORD: z.string().optional(),
    JITSI_URL: z.string().optional(),
    JITSI_PRIVATE_MODE: BoolAsString.optional(),
    ENABLE_FEATURE_MAP_EDITOR: BoolAsString.optional(),
    MAX_USERNAME_LENGTH: PositiveIntAsString.optional(),
    MAX_PER_GROUP: PositiveIntAsString.optional(),
    DISPLAY_TERMS_OF_USE: BoolAsString.optional(),
    NODE_ENV: z.string().optional(),
    CONTACT_URL: z.string().url().optional(),
    POSTHOG_API_KEY: z.string().optional(),
    POSTHOG_URL: z.string().url().optional().or(z.literal("")),
    FALLBACK_LOCALE: z.string().optional(),
    CHAT_URL: z.string().url(),
});

type EnvironmentVariables = z.infer<typeof EnvironmentVariables>;

let env: EnvironmentVariables;
try {
    env = EnvironmentVariables.parse(process.env);
} catch (e) {
    if (e instanceof ZodError) {
        console.error("Errors found in environment variables:");
        for (const issue of e.issues) {
            console.error(`For variable "${issue.path[0]}": ${issue.message}`);
        }

        process.exit(1);
    }
    throw e;
}

function toNumber(value: string | undefined, defaultValue: number): number {
    if (value === undefined || value === "") {
        return defaultValue;
    }
    return Number(value);
}

function toBool(value: BoolAsString | undefined, defaultValue: boolean): boolean {
    if (value === undefined || value === "") {
        return defaultValue;
    }
    return value === "true" || value === "1";
}

export const SECRET_KEY = env.SECRET_KEY;
export const API_URL = env.API_URL;
export const ADMIN_API_URL = env.ADMIN_API_URL;
export const ADMIN_URL = env.ADMIN_URL;
export const ADMIN_API_TOKEN = env.ADMIN_API_TOKEN;
export const ADMIN_SOCKETS_TOKEN = env.ADMIN_SOCKETS_TOKEN;
export const CPU_OVERHEAT_THRESHOLD = toNumber(env.CPU_OVERHEAT_THRESHOLD, 80);
export const PUSHER_HTTP_PORT = toNumber(env.PUSHER_HTTP_PORT, 3000);
export const SOCKET_IDLE_TIMER = toNumber(env.SOCKET_IDLE_TIMER, 120); // maximum time (in second) without activity before a socket is closed. Should be greater than 60 seconds in order to cope for Chrome intensive throttling (https://developer.chrome.com/blog/timer-throttling-in-chrome-88/#intensive-throttling)
export const VITE_URL = env.VITE_URL || "http://front.workadventure.localhost"; // Used only in development
export const ALLOWED_CORS_ORIGIN = env.ALLOWED_CORS_ORIGIN; // Use "*" to allow any domain
export const PUSHER_URL = env.PUSHER_URL || "";
export const PUBLIC_MAP_STORAGE_URL = env.PUBLIC_MAP_STORAGE_URL || "";
export const OPID_CLIENT_ID = env.OPID_CLIENT_ID || "";
export const OPID_CLIENT_SECRET = env.OPID_CLIENT_SECRET || "";
export const OPID_CLIENT_ISSUER = env.OPID_CLIENT_ISSUER || "";
if (OPID_CLIENT_ID && !PUSHER_URL) {
    throw new Error("Missing PUSHER_URL environment variable.");
}
export const OPID_CLIENT_REDIRECT_URL = PUSHER_URL + "/openid-callback";
export const OPID_PROFILE_SCREEN_PROVIDER =
    env.OPID_PROFILE_SCREEN_PROVIDER || (ADMIN_URL ? ADMIN_URL + "/profile" : undefined);
export const OPID_SCOPE = env.OPID_SCOPE || "openid email";
export const OPID_PROMPT = env.OPID_PROMPT || "login";
export const OPID_USERNAME_CLAIM = env.OPID_USERNAME_CLAIM || "username";
export const OPID_LOCALE_CLAIM = env.OPID_LOCALE_CLAIM || "locale";
export const DISABLE_ANONYMOUS: boolean = toBool(env.DISABLE_ANONYMOUS, false);
export const PROMETHEUS_AUTHORIZATION_TOKEN = env.PROMETHEUS_AUTHORIZATION_TOKEN;
export const EJABBERD_DOMAIN: string = env.EJABBERD_DOMAIN || "";
export const EJABBERD_WS_URI: string = env.EJABBERD_WS_URI || "";
export const EJABBERD_JWT_SECRET: string = env.EJABBERD_JWT_SECRET || "";
export const MAX_HISTORY_CHAT: number = toNumber(env.MAX_HISTORY_CHAT, 0);
export const ENABLE_CHAT: boolean = toBool(env.ENABLE_CHAT, true);
export const ENABLE_CHAT_UPLOAD: boolean = toBool(env.ENABLE_CHAT_UPLOAD, true);
export const DEBUG_ERROR_MESSAGES = toBool(env.DEBUG_ERROR_MESSAGES, false);

// If set to the string "true", the /openapi route will return the OpenAPI definition and the swagger-ui/ route will display the documentation
export const ENABLE_OPENAPI_ENDPOINT = toBool(env.ENABLE_OPENAPI_ENDPOINT, false);

// The URL to use if the user is visiting the first time and hitting the "/" route.
export const START_ROOM_URL: string = env.START_ROOM_URL || "/_/global/maps.workadventu.re/starter/map.json";
export const FALLBACK_LOCALE: string | undefined = env.FALLBACK_LOCALE;

// Front container:
export const FRONT_ENVIRONMENT_VARIABLES: FrontConfigurationInterface = {
    DEBUG_MODE: toBool(env.DEBUG_MODE, false),
    PUSHER_URL: env.PUSHER_URL || "/",
    ADMIN_URL: env.ADMIN_URL,
    UPLOADER_URL: env.UPLOADER_URL,
    ICON_URL: env.ICON_URL,
    STUN_SERVER: env.STUN_SERVER,
    TURN_SERVER: env.TURN_SERVER,
    SKIP_RENDER_OPTIMIZATIONS: toBool(env.SKIP_RENDER_OPTIMIZATIONS, false),
    DISABLE_NOTIFICATIONS: toBool(env.DISABLE_NOTIFICATIONS, false),
    TURN_USER: env.TURN_USER,
    TURN_PASSWORD: env.TURN_PASSWORD,
    JITSI_URL: env.JITSI_URL,
    JITSI_PRIVATE_MODE: toBool(env.JITSI_PRIVATE_MODE, false),
    ENABLE_FEATURE_MAP_EDITOR: toBool(env.ENABLE_FEATURE_MAP_EDITOR, false),
    MAX_USERNAME_LENGTH: toNumber(env.MAX_USERNAME_LENGTH, 10),
    MAX_PER_GROUP: toNumber(env.MAX_PER_GROUP, 4),
    DISPLAY_TERMS_OF_USE: toBool(env.DISPLAY_TERMS_OF_USE, false),
    NODE_ENV: env.NODE_ENV || "development",
    CONTACT_URL: env.CONTACT_URL,
    POSTHOG_API_KEY: env.POSTHOG_API_KEY,
    POSTHOG_URL: env.POSTHOG_URL,
    DISABLE_ANONYMOUS: toBool(env.DISABLE_ANONYMOUS, false),
    ENABLE_OPENID: !!env.OPID_CLIENT_ID,
    OPID_PROFILE_SCREEN_PROVIDER: env.OPID_PROFILE_SCREEN_PROVIDER,
    CHAT_URL: env.CHAT_URL,
    ENABLE_CHAT_UPLOAD: toBool(env.ENABLE_CHAT_UPLOAD, true),
    FALLBACK_LOCALE: env.FALLBACK_LOCALE,
};
