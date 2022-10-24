const MINIMUM_DISTANCE = process.env.MINIMUM_DISTANCE ? Number(process.env.MINIMUM_DISTANCE) : 64;
const GROUP_RADIUS = process.env.GROUP_RADIUS ? Number(process.env.GROUP_RADIUS) : 48;
const ADMIN_API_URL = process.env.ADMIN_API_URL || "";
const ADMIN_API_TOKEN = process.env.ADMIN_API_TOKEN || "";
const CPU_OVERHEAT_THRESHOLD = Number(process.env.CPU_OVERHEAT_THRESHOLD) || 80;
const JITSI_URL: string | undefined = process.env.JITSI_URL === "" ? undefined : process.env.JITSI_URL;
const JITSI_ISS = process.env.JITSI_ISS || "";
const SECRET_JITSI_KEY = process.env.SECRET_JITSI_KEY || "";
const ENABLE_FEATURE_MAP_EDITOR = process.env.ENABLE_FEATURE_MAP_EDITOR || false;
const BBB_URL: string = process.env.BBB_URL || "";
const BBB_SECRET = process.env.BBB_SECRET || "";
const HTTP_PORT = parseInt(process.env.HTTP_PORT || "8080") || 8080;
const GRPC_PORT = parseInt(process.env.GRPC_PORT || "50051") || 50051;
export const TURN_STATIC_AUTH_SECRET = process.env.TURN_STATIC_AUTH_SECRET || "";
export const MAX_PER_GROUP = parseInt(process.env.MAX_PER_GROUP || "4");
export const REDIS_HOST = process.env.REDIS_HOST || undefined;
export const REDIS_PORT = parseInt(process.env.REDIS_PORT || "6379") || 6379;
export const REDIS_PASSWORD = process.env.REDIS_PASSWORD || undefined;
export const STORE_VARIABLES_FOR_LOCAL_MAPS = process.env.STORE_VARIABLES_FOR_LOCAL_MAPS === "true";
export const PROMETHEUS_AUTHORIZATION_TOKEN = process.env.PROMETHEUS_AUTHORIZATION_TOKEN;
export const MAP_STORAGE_URL = process.env.MAP_STORAGE_URL || "";
export const PUBLIC_MAP_STORAGE_URL = process.env.PUBLIC_MAP_STORAGE_URL || "";
export const EJABBERD_API_URI = (process.env.EJABBERD_API_URI || "").replace(/\/+$/, "");
export const EJABBERD_DOMAIN = process.env.EJABBERD_DOMAIN || "";
export const EJABBERD_USER = process.env.EJABBERD_USER || "";
export const EJABBERD_PASSWORD = process.env.EJABBERD_PASSWORD || "";
// The maximum time to live of player variables for logged players, expressed in seconds (no limit by default).
// Use "-1" for infinity.
// Note that anonymous players don't have any TTL limit because their data is stored in local storage, not in Redis database.
export const PLAYER_VARIABLES_MAX_TTL = parseInt(process.env.PLAYER_VARIABLES_MAX_TTL || "-1") || -1;

export const ENABLE_CHAT = process.env.ENABLE_CHAT !== "false";
export const ENABLE_CHAT_UPLOAD = process.env.ENABLE_CHAT_UPLOAD !== "false";

export {
    MINIMUM_DISTANCE,
    ADMIN_API_URL,
    ADMIN_API_TOKEN,
    HTTP_PORT,
    GRPC_PORT,
    GROUP_RADIUS,
    CPU_OVERHEAT_THRESHOLD,
    JITSI_URL,
    JITSI_ISS,
    SECRET_JITSI_KEY,
    ENABLE_FEATURE_MAP_EDITOR,
    BBB_URL,
    BBB_SECRET,
};
