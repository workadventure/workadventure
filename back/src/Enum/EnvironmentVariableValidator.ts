import { z } from "zod";
import {
    AbsoluteOrRelativeUrl,
    BoolAsString,
    emptyStringToUndefined,
    PositiveIntAsString,
    toBool,
    toNumber,
} from "@workadventure/shared-utils/src/EnvironmentVariables/EnvironmentVariableUtils";

export const EnvironmentVariables = z.object({
    PLAY_URL: z.string().url(),
    MINIMUM_DISTANCE: PositiveIntAsString.optional().transform((val) => toNumber(val, 64)),
    GROUP_RADIUS: PositiveIntAsString.optional().transform((val) => toNumber(val, 48)),
    ADMIN_API_URL: AbsoluteOrRelativeUrl.optional().transform(emptyStringToUndefined),
    ADMIN_API_TOKEN: z.string().optional().transform(emptyStringToUndefined),
    CPU_OVERHEAT_THRESHOLD: PositiveIntAsString.optional().transform((val) => toNumber(val, 80)),
    JITSI_URL: z.string().optional().transform(emptyStringToUndefined),
    JITSI_ISS: z.string().optional().transform(emptyStringToUndefined),
    SECRET_JITSI_KEY: z.string().optional().transform(emptyStringToUndefined),
    BBB_URL: z.string().url().or(z.literal("")).optional().transform(emptyStringToUndefined),
    BBB_SECRET: z.string().optional().transform(emptyStringToUndefined),
    ENABLE_MAP_EDITOR: BoolAsString.optional().transform((val) => toBool(val, false)),
    HTTP_PORT: PositiveIntAsString.optional().transform((val) => toNumber(val, 8080)),
    GRPC_PORT: PositiveIntAsString.optional().transform((val) => toNumber(val, 50051)),
    TURN_STATIC_AUTH_SECRET: z.string().optional().transform(emptyStringToUndefined),
    MAX_PER_GROUP: PositiveIntAsString.optional()
        .or(z.string().max(0))
        .transform((val) => toNumber(val, 4)),
    REDIS_HOST: z.string().optional().transform(emptyStringToUndefined),
    REDIS_PORT: PositiveIntAsString.optional().transform((val) => toNumber(val, 6379)),
    REDIS_PASSWORD: z.string().optional().transform(emptyStringToUndefined),
    STORE_VARIABLES_FOR_LOCAL_MAPS: BoolAsString.optional().transform((val) => toBool(val, false)),
    PROMETHEUS_AUTHORIZATION_TOKEN: z.string().optional().describe("The token to access the Prometheus metrics."),
    PROMETHEUS_PORT: PositiveIntAsString.optional()
        .transform((val) => toNumber(val, 0))
        .describe(
            "The port to access the Prometheus metrics. If not set, the default port is used AND an authorization token is required."
        ),
    MAP_STORAGE_URL: z
        .string()
        .optional()
        .transform(emptyStringToUndefined)
        .describe(
            'The URL to the gRPC endpoint of the map-storage server (for instance: "map-storage.example.com:50053"'
        ),
    PUBLIC_MAP_STORAGE_URL: z
        .string()
        .url()
        .optional()
        .transform(emptyStringToUndefined)
        .describe('The public URL to the map-storage server (for instance: "https://map-storage.example.com"'),
    INTERNAL_MAP_STORAGE_URL: AbsoluteOrRelativeUrl.optional()
        .transform(emptyStringToUndefined)
        .describe('The internal URL to the map-storage server (for instance: "https://map-storage:3000"'),
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
    SENTRY_DSN: z.string().optional().describe("If set, WorkAdventure will send errors to Sentry"),
    SENTRY_RELEASE: z
        .string()
        .optional()
        .describe("The Sentry release we target. Only used if SENTRY_DSN is configured."),
    SENTRY_TRACES_SAMPLE_RATE: z
        .string()
        .optional()
        .transform((val) => toNumber(val, 0.1))
        .describe("The Sentry traces sample rate. Only used if SENTRY_DSN is configured. Defaults to 0.1"),
    SENTRY_ENVIRONMENT: z
        .string()
        .optional()
        .describe("The Sentry environnement we target. Only used if SENTRY_DSN is configured."),
    GRPC_MAX_MESSAGE_SIZE: z
        .number()
        .optional()
        .default(20 * 1024 * 1024) // Default to 20 MB
        .describe("The maximum size of a gRPC message. Defaults to 20 MB."),
    LIVEKIT_HOST: z.string().optional().describe("The Livekit host."),
    LIVEKIT_API_KEY: z.string().optional().describe("The Livekit API key."),
    LIVEKIT_API_SECRET: z.string().optional().describe("The Livekit API secret."),
    LIVEKIT_WS_URL: z.string().optional().describe("The Livekit WebSocket URL."),

    LIVEKIT_RECORDING_S3_ENDPOINT: z
        .string()
        .optional()
        .transform(emptyStringToUndefined)
        .describe("The S3 endpoint for Livekit recording."),
    LIVEKIT_RECORDING_S3_ACCESS_KEY: z
        .string()
        .optional()
        .describe("The S3 access key for Livekit recording."),
    LIVEKIT_RECORDING_S3_SECRET_KEY: z
        .string()
        .optional()
        .describe("The S3 secret key for Livekit recording."),
    LIVEKIT_RECORDING_S3_REGION: z
        .string()
        .optional()
        .describe("The S3 region for Livekit recording."),
    LIVEKIT_RECORDING_S3_BUCKET: z
        .string()
        .optional()
        .describe("The S3 bucket for Livekit recording."),
});

export type EnvironmentVariables = z.infer<typeof EnvironmentVariables>;
