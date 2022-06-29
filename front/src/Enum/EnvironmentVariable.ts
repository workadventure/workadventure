import { getEnvConfig } from "@geprog/vite-plugin-env-config/getEnvConfig";

const DEBUG_MODE: boolean = getEnvConfig("DEBUG_MODE") == "true";
const PUSHER_URL = getEnvConfig("PUSHER_URL") || "//pusher.workadventure.localhost";
export const ADMIN_URL = getEnvConfig("ADMIN_URL") || "//workadventu.re";
const UPLOADER_URL = getEnvConfig("UPLOADER_URL") || "//uploader.workadventure.localhost";
const ICON_URL = getEnvConfig("ICON_URL") || "//icon.workadventure.localhost";
const STUN_SERVER: string = getEnvConfig("STUN_SERVER") || "stun:stun.l.google.com:19302";
const TURN_SERVER: string = getEnvConfig("TURN_SERVER") || "";
const SKIP_RENDER_OPTIMIZATIONS: boolean = getEnvConfig("SKIP_RENDER_OPTIMIZATIONS") == "true";
const DISABLE_NOTIFICATIONS: boolean = getEnvConfig("DISABLE_NOTIFICATIONS") == "true";
const TURN_USER: string = getEnvConfig("TURN_USER") || "";
const TURN_PASSWORD: string = getEnvConfig("TURN_PASSWORD") || "";
const JITSI_URL: string | undefined = getEnvConfig("JITSI_URL") === "" ? undefined : getEnvConfig("JITSI_URL");
const JITSI_PRIVATE_MODE: boolean = getEnvConfig("JITSI_PRIVATE_MODE") == "true";
const POSITION_DELAY = 200; // Wait 200ms between sending position events
const MAX_EXTRAPOLATION_TIME = 100; // Extrapolate a maximum of 250ms if no new movement is sent by the player
export const MAX_USERNAME_LENGTH = parseInt(getEnvConfig("MAX_USERNAME_LENGTH") || "") || 8;
export const MAX_PER_GROUP = parseInt(getEnvConfig("MAX_PER_GROUP") || "4");
export const DISPLAY_TERMS_OF_USE = getEnvConfig("DISPLAY_TERMS_OF_USE") == "true";
export const NODE_ENV = getEnvConfig("NODE_ENV") || "development";
export const CONTACT_URL = getEnvConfig("CONTACT_URL") || undefined;
export const PROFILE_URL = getEnvConfig("PROFILE_URL") || undefined;
export const IDENTITY_URL = getEnvConfig("IDENTITY_URL") || undefined;
export const POSTHOG_API_KEY: string = (getEnvConfig("POSTHOG_API_KEY") as string) || "";
export const POSTHOG_URL = getEnvConfig("POSTHOG_URL") || undefined;
export const DISABLE_ANONYMOUS: boolean = getEnvConfig("DISABLE_ANONYMOUS") === "true";
export const OPID_LOGIN_SCREEN_PROVIDER = getEnvConfig("OPID_LOGIN_SCREEN_PROVIDER");
const FALLBACK_LOCALE = getEnvConfig("FALLBACK_LOCALE") || undefined;
export const CHAT_URL = getEnvConfig("CHAT_URL") || "//chat.workadventure.localhost";


export {
    DEBUG_MODE,
    SKIP_RENDER_OPTIMIZATIONS,
    DISABLE_NOTIFICATIONS,
    PUSHER_URL,
    UPLOADER_URL,
    ICON_URL,
    POSITION_DELAY,
    MAX_EXTRAPOLATION_TIME,
    STUN_SERVER,
    TURN_SERVER,
    TURN_USER,
    TURN_PASSWORD,
    JITSI_URL,
    JITSI_PRIVATE_MODE,
    FALLBACK_LOCALE,
};
