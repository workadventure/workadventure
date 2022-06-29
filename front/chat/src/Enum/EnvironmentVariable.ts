import { getEnvConfig } from "@geprog/vite-plugin-env-config/getEnvConfig";

const PUSHER_URL = getEnvConfig("PUSHER_URL") || "//pusher.workadventure.localhost";
const FALLBACK_LOCALE = getEnvConfig("FALLBACK_LOCALE") || undefined;
const CHAT_URL = getEnvConfig("CHAT_URL") || "//chat.workadventure.localhost";

export { PUSHER_URL, FALLBACK_LOCALE, CHAT_URL };
