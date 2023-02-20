import { z } from "zod";

const BoolAsString = z.union([z.literal("true"), z.literal("false"), z.literal("0"), z.literal("1"), z.literal("")]);
type BoolAsString = z.infer<typeof BoolAsString>;

const PositiveIntAsString = z.string().regex(/^\d*$/, { message: "Must be a positive integer number" });
type PositiveIntAsString = z.infer<typeof PositiveIntAsString>;

const AbsoluteOrRelativeUrl = z.string().url().or(z.string().startsWith("/"));

const EnvironmentVariables = z.object({
    PLAY_URL: z.string().url(),
    MINIMUM_DISTANCE: PositiveIntAsString.optional().transform((val) => toNumber(val, 64)),
    GROUP_RADIUS: PositiveIntAsString.optional().transform((val) => toNumber(val, 48)),
    ADMIN_API_URL: AbsoluteOrRelativeUrl.optional(),
    ADMIN_API_TOKEN: z.string().optional(),
    CPU_OVERHEAT_THRESHOLD: PositiveIntAsString.optional().transform((val) => toNumber(val, 80)),
    JITSI_URL: z.string().optional(),
    JITSI_ISS: z.string().optional(),
    SECRET_JITSI_KEY: z.string().optional(),
    BBB_URL: z.string().url().optional(),
    BBB_SECRET: z.string().optional(),
    ENABLE_FEATURE_MAP_EDITOR: BoolAsString.optional().transform((val) => toBool(val, false)),
    HTTP_PORT: PositiveIntAsString.optional().transform((val) => toNumber(val, 8080)),
    GRPC_PORT: PositiveIntAsString.optional().transform((val) => toNumber(val, 50051)),
    TURN_STATIC_AUTH_SECRET: z.string().optional(),
    MAX_PER_GROUP: PositiveIntAsString.optional()
        .or(z.string().max(0))
        .transform((val) => toNumber(val, 4)),
    REDIS_HOST: z.string().optional(),
    REDIS_PORT: PositiveIntAsString.optional().transform((val) => toNumber(val, 6379)),
    REDIS_PASSWORD: z.string().optional(),
    STORE_VARIABLES_FOR_LOCAL_MAPS: BoolAsString.optional().transform((val) => toBool(val, false)),
    PROMETHEUS_AUTHORIZATION_TOKEN: z.string().optional(),
    MAP_STORAGE_URL: z.string().optional(),
    PUBLIC_MAP_STORAGE_URL: AbsoluteOrRelativeUrl.optional(),
    EJABBERD_API_URI: AbsoluteOrRelativeUrl.optional().transform((val) => val?.replace(/\/+$/, "")),
    EJABBERD_DOMAIN: z.string().optional(),
    EJABBERD_USER: z.string().optional(),
    EJABBERD_PASSWORD: z.string().optional(),
    PLAYER_VARIABLES_MAX_TTL: z
        .string()
        .optional()
        .transform((val) => toNumber(val, -1))
        .describe(`The maximum time to live of player variables for logged players, expressed in seconds (no limit by default).
Use "-1" for infinity.
Note that anonymous players don't have any TTL limit because their data is stored in local storage, not in Redis database.
`),
    ENABLE_CHAT: BoolAsString.optional().transform((val) => toBool(val, true)),
    ENABLE_CHAT_UPLOAD: BoolAsString.optional().transform((val) => toBool(val, true)),
    ENABLE_TELEMETRY: BoolAsString.optional()
        .transform((val) => toBool(val, true))
        .describe(
            "By default, WorkAdventure will send telemetry usage once a day. This data contains the version of WorkAdventure used and very rough usage (max number of users...). The statistics collected through telemetry can provide developers valuable insights into WorkAdventure versions that are actually used. No personal user data is sent. Please keep this setting to true unless your WorkAdventure installation is 'secret'."
        ),
    SECURITY_EMAIL: z
        .string()
        .email()
        .optional()
        .describe(
            'This email address will be notified if your WorkAdventure version contains a known security flaw. ENABLE_TELEMETRY must be set to "true" for this.'
        ),
    TELEMETRY_URL: z.string().optional().default("https://stats.workadventu.re"),
});

type EnvironmentVariables = z.infer<typeof EnvironmentVariables>;

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

const env: EnvironmentVariables = envChecking.data;

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

export const PLAY_URL = env.PLAY_URL;
export const MINIMUM_DISTANCE = env.MINIMUM_DISTANCE;
export const GROUP_RADIUS = env.GROUP_RADIUS;
export const ADMIN_API_URL = env.ADMIN_API_URL;
export const ADMIN_API_TOKEN = env.ADMIN_API_TOKEN;
export const CPU_OVERHEAT_THRESHOLD = env.CPU_OVERHEAT_THRESHOLD;
export const JITSI_URL = env.JITSI_URL;
export const JITSI_ISS = env.JITSI_ISS;
export const SECRET_JITSI_KEY = env.SECRET_JITSI_KEY;
export const BBB_URL = env.BBB_URL;
export const BBB_SECRET = env.BBB_SECRET;
export const ENABLE_FEATURE_MAP_EDITOR = env.ENABLE_FEATURE_MAP_EDITOR;
export const HTTP_PORT = env.HTTP_PORT;
export const GRPC_PORT = env.GRPC_PORT;
export const TURN_STATIC_AUTH_SECRET = env.TURN_STATIC_AUTH_SECRET;
export const MAX_PER_GROUP = env.MAX_PER_GROUP;
export const REDIS_HOST = env.REDIS_HOST;
export const REDIS_PORT = env.REDIS_PORT;
export const REDIS_PASSWORD = env.REDIS_PASSWORD;
export const STORE_VARIABLES_FOR_LOCAL_MAPS = env.STORE_VARIABLES_FOR_LOCAL_MAPS;
export const PROMETHEUS_AUTHORIZATION_TOKEN = env.PROMETHEUS_AUTHORIZATION_TOKEN;
export const MAP_STORAGE_URL = env.MAP_STORAGE_URL;
export const PUBLIC_MAP_STORAGE_URL = env.PUBLIC_MAP_STORAGE_URL;
export const EJABBERD_API_URI = env.EJABBERD_API_URI;
export const EJABBERD_DOMAIN = env.EJABBERD_DOMAIN;
export const EJABBERD_USER = env.EJABBERD_USER;
export const EJABBERD_PASSWORD = env.EJABBERD_PASSWORD;
export const PLAYER_VARIABLES_MAX_TTL = env.PLAYER_VARIABLES_MAX_TTL;
export const ENABLE_CHAT = env.ENABLE_CHAT;
export const ENABLE_CHAT_UPLOAD = env.ENABLE_CHAT_UPLOAD;
export const ENABLE_TELEMETRY = env.ENABLE_TELEMETRY;
export const SECURITY_EMAIL = env.SECURITY_EMAIL;
export const TELEMETRY_URL = env.TELEMETRY_URL;
