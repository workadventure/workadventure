import { EnvironmentVariables } from "./EnvironmentVariableValidator";

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
export const ENABLE_MAP_EDITOR = env.ENABLE_MAP_EDITOR;
export const HTTP_PORT = env.HTTP_PORT;
export const GRPC_PORT = env.GRPC_PORT;
export const TURN_STATIC_AUTH_SECRET = env.TURN_STATIC_AUTH_SECRET;
export const MAX_PER_GROUP = env.MAX_PER_GROUP;
export const REDIS_HOST = env.REDIS_HOST;
export const REDIS_PORT = env.REDIS_PORT;
export const REDIS_PASSWORD = env.REDIS_PASSWORD;
export const STORE_VARIABLES_FOR_LOCAL_MAPS = env.STORE_VARIABLES_FOR_LOCAL_MAPS;
export const PROMETHEUS_AUTHORIZATION_TOKEN = env.PROMETHEUS_AUTHORIZATION_TOKEN;
export const PROMETHEUS_PORT = env.PROMETHEUS_PORT === env.HTTP_PORT ? 0 : env.PROMETHEUS_PORT;
export const MAP_STORAGE_URL = env.MAP_STORAGE_URL;
export const PUBLIC_MAP_STORAGE_URL = env.PUBLIC_MAP_STORAGE_URL;
export const PUBLIC_MAP_STORAGE_PREFIX = PUBLIC_MAP_STORAGE_URL ? new URL(PUBLIC_MAP_STORAGE_URL).pathname : undefined;
export const INTERNAL_MAP_STORAGE_URL = env.INTERNAL_MAP_STORAGE_URL;
export const PLAYER_VARIABLES_MAX_TTL = env.PLAYER_VARIABLES_MAX_TTL;
export const ENABLE_CHAT = env.ENABLE_CHAT;
export const ENABLE_CHAT_UPLOAD = env.ENABLE_CHAT_UPLOAD;
export const ENABLE_TELEMETRY = env.ENABLE_TELEMETRY;
export const SECURITY_EMAIL = env.SECURITY_EMAIL;
export const TELEMETRY_URL = env.TELEMETRY_URL;

export const SENTRY_DSN = env.SENTRY_DSN;
export const SENTRY_ENVIRONMENT = env.SENTRY_ENVIRONMENT;
export const SENTRY_RELEASE = env.SENTRY_RELEASE;
export const SENTRY_TRACES_SAMPLE_RATE = env.SENTRY_TRACES_SAMPLE_RATE;
