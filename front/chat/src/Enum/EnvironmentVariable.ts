import { getEnvConfig } from "@geprog/vite-plugin-env-config/getEnvConfig";

const PUSHER_URL = getEnvConfig("PUSHER_URL") || "//pusher.workadventure.localhost";

export { PUSHER_URL};
