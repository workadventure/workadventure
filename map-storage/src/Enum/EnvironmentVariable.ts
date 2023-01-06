import { z, ZodError } from "zod";

const BoolAsString = z.union([z.literal("true"), z.literal("false"), z.literal("0"), z.literal("1"), z.literal("")]);
type BoolAsString = z.infer<typeof BoolAsString>;

const PositiveIntAsString = z.string().regex(/^\d*$/, { message: "Must be a positive integer number" });
type PositiveIntAsString = z.infer<typeof PositiveIntAsString>;

//const AbsoluteOrRelativeUrl = z.string().url().or(z.string().startsWith("/"));

const BasicEnvironmentVariables = z.object({
    AWS_ACCESS_KEY_ID: z.string().optional(),
    AWS_SECRET_ACCESS_KEY: z.string().optional(),
    AWS_DEFAULT_REGION: z.string().optional(),
    AWS_BUCKET: z.string().optional(),
    AWS_URL: z.string().url().optional(),
    AWS_ENDPOINT: z.string().url().optional(),
    //UPLOADER_AWS_SIGNED_URL_EXPIRATION: PositiveIntAsString.optional(),
    S3_UPLOAD_CONCURRENCY_LIMIT: PositiveIntAsString.optional(),
    MAX_UNCOMPRESSED_SIZE: PositiveIntAsString.optional().describe(
        "The maximum size of an uploaded file. This the total size of the uncompressed file (not the ZIP file). Defaults to 1GB"
    ),
    USE_DOMAIN_NAME_IN_PATH: BoolAsString.optional().describe(
        "If true, the domain name will be used as a top level directory when fetching/storing files"
    ),
    STORAGE_DIRECTORY: z
        .string()
        .optional()
        .describe("Storage directory for the maps on physical disk. Used if S3 storage is not configured."),
    CACHE_CONTROL: z
        .string()
        .optional()
        .describe(
            'The cache-control HTTP header to be used for "normal" ressources. Note: resources containing a hash in the name will be set to "immutable", whatever this setting is.'
        ),
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

const EnvironmentVariables = z.intersection(BasicEnvironmentVariables, AuthEnvVariable);

type EnvironmentVariables = z.infer<typeof EnvironmentVariables>;

let env: EnvironmentVariables;
try {
    env = EnvironmentVariables.parse(process.env);
} catch (e) {
    if (e instanceof ZodError) {
        console.error("Errors found in environment variables:");

        for (const [name, value] of Object.entries(e.format())) {
            if (name === "_errors") {
                continue;
            }
            // It appears the typing of "value" is incorrect in Zod (!)
            //eslint-disable-next-line @typescript-eslint/ban-ts-comment
            //@ts-ignore
            for (const error of value._errors as string[]) {
                console.error(`For variable "${name}": ${error}`);
            }
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

export const AWS_ACCESS_KEY_ID = env.AWS_ACCESS_KEY_ID;
export const AWS_SECRET_ACCESS_KEY = env.AWS_SECRET_ACCESS_KEY;
export const AWS_DEFAULT_REGION = env.AWS_DEFAULT_REGION;
export const AWS_BUCKET = env.AWS_BUCKET;
export const AWS_URL = env.AWS_URL;
export const AWS_ENDPOINT = env.AWS_ENDPOINT;
//export const UPLOADER_AWS_SIGNED_URL_EXPIRATION = toNumber(env.UPLOADER_AWS_SIGNED_URL_EXPIRATION, 60);
export const S3_UPLOAD_CONCURRENCY_LIMIT = toNumber(env.S3_UPLOAD_CONCURRENCY_LIMIT, 100);
export const MAX_UNCOMPRESSED_SIZE = toNumber(env.MAX_UNCOMPRESSED_SIZE, 1024 * 1024 * 1024);
export const USE_DOMAIN_NAME_IN_PATH = toBool(env.USE_DOMAIN_NAME_IN_PATH, false);
export const STORAGE_DIRECTORY = env.STORAGE_DIRECTORY || "./public";
// By default, cache only 10 seconds in the CDN
export const CACHE_CONTROL = env.CACHE_CONTROL || "public, s-max-age=10";
export const ENV_VARS = env;
