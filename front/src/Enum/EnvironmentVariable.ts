declare global {
    interface Window {
        env?: Record<string, string>;
    }
}

const getEnv = (key: string): string | undefined => {
    if (global.window?.env) {
        return global.window.env[key];
    }
    if (global.process?.env) {
        return global.process.env[key];
    }
    return;
};

const DEBUG_MODE: boolean = getEnv("DEBUG_MODE") == "true";
const START_ROOM_URL: string = getEnv("START_ROOM_URL") || "/_/global/maps.workadventure.localhost/Floor1/floor1.json";
const PUSHER_URL = getEnv("PUSHER_URL") || "//pusher.workadventure.localhost";
export const ADMIN_URL = getEnv("ADMIN_URL") || "//workadventu.re";
const UPLOADER_URL = getEnv("UPLOADER_URL") || "//uploader.workadventure.localhost";
const ICON_URL = getEnv("ICON_URL") || "//icon.workadventure.localhost";
const STUN_SERVER: string = getEnv("STUN_SERVER") || "stun:stun.l.google.com:19302";
const TURN_SERVER: string = getEnv("TURN_SERVER") || "";
const SKIP_RENDER_OPTIMIZATIONS: boolean = getEnv("SKIP_RENDER_OPTIMIZATIONS") == "true";
const DISABLE_NOTIFICATIONS: boolean = getEnv("DISABLE_NOTIFICATIONS") == "true";
const TURN_USER: string = getEnv("TURN_USER") || "";
const TURN_PASSWORD: string = getEnv("TURN_PASSWORD") || "";
const JITSI_URL: string | undefined = getEnv("JITSI_URL") === "" ? undefined : getEnv("JITSI_URL");
const JITSI_PRIVATE_MODE: boolean = getEnv("JITSI_PRIVATE_MODE") == "true";
const POSITION_DELAY = 200; // Wait 200ms between sending position events
const MAX_EXTRAPOLATION_TIME = 100; // Extrapolate a maximum of 250ms if no new movement is sent by the player
export const MAX_USERNAME_LENGTH = parseInt(getEnv("MAX_USERNAME_LENGTH") || "") || 8;
export const MAX_PER_GROUP = parseInt(getEnv("MAX_PER_GROUP") || "4");
export const DISPLAY_TERMS_OF_USE = getEnv("DISPLAY_TERMS_OF_USE") == "true";
export const NODE_ENV = getEnv("NODE_ENV") || "development";
export const CONTACT_URL = getEnv("CONTACT_URL") || undefined;
export const PROFILE_URL = getEnv("PROFILE_URL") || undefined;
export const POSTHOG_API_KEY: string = (getEnv("POSTHOG_API_KEY") as string) || "";
export const POSTHOG_URL = getEnv("POSTHOG_URL") || undefined;
export const DISABLE_ANONYMOUS: boolean = getEnv("DISABLE_ANONYMOUS") === "true";
export const OPID_LOGIN_SCREEN_PROVIDER = getEnv("OPID_LOGIN_SCREEN_PROVIDER");
const FALLBACK_LOCALE = getEnv("FALLBACK_LOCALE") || undefined;

export {
    DEBUG_MODE,
    START_ROOM_URL,
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
