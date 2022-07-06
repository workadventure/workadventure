import { getEnvConfig } from "@geprog/vite-plugin-env-config/getEnvConfig";

const PUSHER_URL = getEnvConfig("PUSHER_URL") || "//pusher.workadventure.localhost";
const FALLBACK_LOCALE = getEnvConfig("FALLBACK_LOCALE") || undefined;

export { PUSHER_URL, FALLBACK_LOCALE };
