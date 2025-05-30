import { z } from "zod";
import {
    AbsoluteOrRelativeUrl,
    BoolAsString,
    emptyStringToDefault,
    emptyStringToUndefined,
    PositiveIntAsString,
    toBool,
    toNumber,
} from "@workadventure/shared-utils/src/EnvironmentVariables/EnvironmentVariableUtils";

export const EnvironmentVariables = z.object({
    API_URL: z.string().min(1).describe("The URI(s) of the back server"),
    AWS_ACCESS_KEY_ID: z.string().optional().transform(emptyStringToUndefined),
    AWS_SECRET_ACCESS_KEY: z.string().optional().transform(emptyStringToUndefined),
    AWS_DEFAULT_REGION: z.string().optional().transform(emptyStringToUndefined),
    AWS_BUCKET: z.string().optional().transform(emptyStringToUndefined),
    AWS_URL: z
        .string()
        .url()
        .or(z.literal(""))
        .optional()
        .transform(emptyStringToUndefined)
        .describe("URL of the S3 endpoint."),
    //UPLOADER_AWS_SIGNED_URL_EXPIRATION: PositiveIntAsString.optional(),
    S3_UPLOAD_CONCURRENCY_LIMIT: PositiveIntAsString.optional().transform((val) => toNumber(val, 100)),
    MAX_UNCOMPRESSED_SIZE: PositiveIntAsString.optional()
        .transform((val) => toNumber(val, 1024 * 1024 * 1024))
        .describe(
            "The maximum size of an uploaded file. This the total size of the uncompressed file (not the ZIP file). Defaults to 1GB"
        ),
    USE_DOMAIN_NAME_IN_PATH: BoolAsString.optional()
        .transform((val) => toBool(val, false))
        .describe("If true, the domain name will be used as a top level directory when fetching/storing files"),
    PATH_PREFIX: z
        .string()
        .optional()
        .describe(
            "The prefix to strip if a reverse proxy is proxying calls to the map-storage from a path, e.g. /map-storage"
        )
        .transform(emptyStringToUndefined),
    STORAGE_DIRECTORY: z
        .string()
        .optional()
        .transform(emptyStringToDefault("./public"))
        .describe("Storage directory for the maps on physical disk. Used if S3 storage is not configured."),
    CACHE_CONTROL: z
        .string()
        .optional()
        .transform(emptyStringToDefault("public, s-max-age=10"))
        .describe(
            'The cache-control HTTP header to be used for "normal" resources. Note: resources containing a hash in the name will be set to "immutable", whatever this setting is.'
        ),
    ENABLE_WEB_HOOK: BoolAsString.optional()
        .transform((val) => toBool(val, true))
        .describe("If true, the webhook will be called when a WAM file is created"),
    WEB_HOOK_URL: z
        .string()
        .optional()
        .describe(
            "The URL of the webhook to call when a WAM file is created / updated / deleted. The URL will be called using POST."
        )
        .transform(emptyStringToUndefined),
    WEB_HOOK_API_TOKEN: z
        .string()
        .optional()
        .describe(
            "The (optional) API token to use when calling the webhook. The token will be sent in the Authorization header of the POST request."
        )
        .transform(emptyStringToUndefined),
    MAX_SIMULTANEOUS_FS_READS: PositiveIntAsString.optional()
        .transform((val) => toNumber(val, 100))
        .describe(
            "The maximum number of simultaneous file system (local or S3) reads when regenerating the cache file. Defaults to 100."
        ),
    SENTRY_DSN: z
        .string()
        .optional()
        .transform(emptyStringToUndefined)
        .describe("If set, WorkAdventure will send errors to Sentry"),
    SENTRY_RELEASE: z
        .string()
        .optional()
        .transform(emptyStringToUndefined)
        .describe("The Sentry release we target. Only used if SENTRY_DSN is configured."),
    SENTRY_ENVIRONMENT: z
        .string()
        .optional()
        .transform(emptyStringToUndefined)
        .describe("The Sentry environment we target. Only used if SENTRY_DSN is configured."),
    SENTRY_TRACES_SAMPLE_RATE: z
        .string()
        .optional()
        .transform((val) => toNumber(val, 0.1))
        .describe("The sampling rate for Sentry traces. Only used if SENTRY_DSN is configured. Defaults to 0.1"),
    AUTHENTICATION_STRATEGY: z
        .union([z.literal("Bearer"), z.literal("Basic"), z.literal("Digest"), z.literal("")])
        .optional()
        .describe(
            "Deprecated. Use ENABLE_BEARER_AUTHENTICATION, ENABLE_BASIC_AUTHENTICATION or ENABLE_DIGEST_AUTHENTICATION instead"
        )
        .transform(emptyStringToUndefined),
    ENABLE_BEARER_AUTHENTICATION: BoolAsString.optional()
        .transform((val) => toBool(val, false))
        .describe(
            "Enables bearer authentication. When true, you need to set either AUTHENTICATION_TOKEN or AUTHENTICATION_VALIDATOR_URL"
        ),
    AUTHENTICATION_TOKEN: z
        .string()
        .optional()
        .describe("The hard-coded bearer token to use for authentication")
        .transform(emptyStringToUndefined),
    AUTHENTICATION_VALIDATOR_URL: z
        .string()
        .url()
        .or(z.literal(""))
        .optional()
        .describe("The URL that will be used to remotely validate a bearer token")
        .transform(emptyStringToUndefined),
    ENABLE_BASIC_AUTHENTICATION: BoolAsString.optional()
        .transform((val) => toBool(val, false))
        .describe(
            "Enables basic authentication. When true, you need to set both AUTHENTICATION_USER and AUTHENTICATION_PASSWORD"
        ),
    ENABLE_DIGEST_AUTHENTICATION: BoolAsString.optional()
        .transform((val) => toBool(val, false))
        .describe(
            "Enables basic authentication. When true, you need to set both AUTHENTICATION_USER and AUTHENTICATION_PASSWORD"
        ),
    AUTHENTICATION_USER: z.string().optional().transform(emptyStringToUndefined),
    AUTHENTICATION_PASSWORD: z.string().optional().transform(emptyStringToUndefined),
    WAM_TEMPLATE_URL: z
        .string()
        .url()
        .or(z.literal(""))
        .optional()
        .describe("The URL to fetch an empty WAM template")
        .transform(emptyStringToUndefined),
    ENTITY_COLLECTION_URLS: z
        .string()
        .url()
        .or(z.literal(""))
        .optional()
        .describe(
            "A comma separated list of entity collection URLs to be used when a new TMJ map is uploaded. Note: ignored if WAM_TEMPLATE_URL is set."
        )
        .transform(emptyStringToUndefined),
    MAP_STORAGE_API_TOKEN: z.string(),
    PUSHER_URL: AbsoluteOrRelativeUrl,
    WHITELISTED_RESOURCE_URLS: z
        .string()
        .optional()
        .transform((val) => (val && val.trim().length > 0 ? val.split(",") : [])),
    SECRET_KEY: z
        .string()
        .optional()
        .describe(
            "The JWT token to use when the map-storage is used as a file server. This token will be used to authenticate the user when accessing files."
        ),
});

export type EnvironmentVariables = z.infer<typeof EnvironmentVariables>;
