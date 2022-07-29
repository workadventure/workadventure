import { getEnvConfig } from "@geprog/vite-plugin-env-config/getEnvConfig";

const PUSHER_URL =
  getEnvConfig("PUSHER_URL") || "//pusher.workadventure.localhost";
const FALLBACK_LOCALE = getEnvConfig("FALLBACK_LOCALE") || undefined;


const AWS_BUCKET = getEnvConfig("AWS_BUCKET") || undefined;
const AWS_ACCESS_KEY_ID = getEnvConfig("AWS_ACCESS_KEY_ID") || undefined;
const AWS_SECRET_ACCESS_KEY = getEnvConfig("AWS_SECRET_ACCESS_KEY") || undefined;
const AWS_DEFAULT_REGION = getEnvConfig("AWS_DEFAULT_REGION") || undefined;
const AWS_ENDPOINT = getEnvConfig("AWS_ENDPOINT") || undefined;

export { PUSHER_URL, FALLBACK_LOCALE, AWS_BUCKET, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_DEFAULT_REGION, AWS_ENDPOINT };
