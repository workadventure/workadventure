import { z } from "zod";
import {
    BoolAsString,
    PositiveIntAsString,
    toBool,
    toNumber,
} from "@workadventure/shared-utils/src/EnvironmentVariables/EnvironmentVariableUtils";

const BasicEnvironmentVariables = z.object({
    API_URL: z.string().min(1).describe("The URI(s) of the back server"),
    AWS_ACCESS_KEY_ID: z.string().optional(),
    AWS_SECRET_ACCESS_KEY: z.string().optional(),
    AWS_DEFAULT_REGION: z.string().optional(),
    AWS_BUCKET: z.string().optional(),
    AWS_URL: z.string().url().optional(),
    AWS_ENDPOINT: z.string().url().optional(),
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
        ),
    STORAGE_DIRECTORY: z
        .string()
        .optional()
        .default("./public")
        .describe("Storage directory for the maps on physical disk. Used if S3 storage is not configured."),
    CACHE_CONTROL: z
        .string()
        .optional()
        .default("public, s-max-age=10")
        .describe(
            'The cache-control HTTP header to be used for "normal" resources. Note: resources containing a hash in the name will be set to "immutable", whatever this setting is.'
        ),
    ENABLE_WEB_HOOK: z
        .boolean()
        .optional()
        .default(true)
        .describe("If true, the webhook will be called when a WAM file is created"),
    WEB_HOOK_URL: z
        .string()
        .optional()
        .describe(
            "The URL of the webhook to call when a WAM file is created / updated / deleted. The URL will be called using POST."
        ),
    WEB_HOOK_API_TOKEN: z
        .string()
        .optional()
        .describe(
            "The (optional) API token to use when calling the webhook. The token will be sent in the Authorization header of the POST request."
        ),
    SENTRY_DSN: z.string().optional().describe("If set, WorkAdventure will send errors to Sentry"),
    SENTRY_RELEASE: z
        .string()
        .optional()
        .describe("The Sentry release we target. Only used if SENTRY_DSN is configured."),
    SENTRY_ENVIRONMENT: z
        .string()
        .optional()
        .describe("The Sentry environment we target. Only used if SENTRY_DSN is configured."),
    SENTRY_TRACES_SAMPLE_RATE: z
        .string()
        .optional()
        .transform((val) => toNumber(val, 0.1))
        .describe("The sampling rate for Sentry traces. Only used if SENTRY_DSN is configured. Defaults to 0.1"),
});

const BearerAuthEnvVariables = z.object({
    AUTHENTICATION_STRATEGY: z.literal("Bearer"),
    AUTHENTICATION_TOKEN: z.string().min(1),
});

const BasicAuthEnvVariables = z.object({
    AUTHENTICATION_STRATEGY: z.literal("Basic"),
    AUTHENTICATION_USER: z.string().min(1),
    AUTHENTICATION_PASSWORD: z.string().min(1),
});

const DigestAuthEnvVariables = z.object({
    AUTHENTICATION_STRATEGY: z.literal("Digest"),
    AUTHENTICATION_USER: z.string().min(1),
    AUTHENTICATION_PASSWORD: z.string().min(1),
});

const AuthEnvVariable = z.union([BearerAuthEnvVariables, BasicAuthEnvVariables, DigestAuthEnvVariables]);

export const EnvironmentVariables = z.intersection(BasicEnvironmentVariables, AuthEnvVariable);

export type EnvironmentVariables = z.infer<typeof EnvironmentVariables>;
