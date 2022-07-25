import { getEnvConfig } from "@geprog/vite-plugin-env-config/getEnvConfig";

const PUSHER_URL =
  getEnvConfig("PUSHER_URL") || "//pusher.workadventure.localhost";
const FALLBACK_LOCALE = getEnvConfig("FALLBACK_LOCALE") || undefined;
const EJABBERD_DOMAIN = getEnvConfig("EJABBERD_DOMAIN") || "ejabberd";

export { PUSHER_URL, FALLBACK_LOCALE, EJABBERD_DOMAIN };
