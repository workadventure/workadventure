const DEBUG_MODE: boolean = process.env.DEBUG_MODE == "true";
const START_ROOM_URL: string =
    process.env.START_ROOM_URL || "/_/global/maps.workadventure.localhost/Floor1/floor1.json";
const PUSHER_URL = process.env.PUSHER_URL || "//pusher.workadventure.localhost";
export const ADMIN_URL = process.env.ADMIN_URL || "//workadventu.re";
const UPLOADER_URL = process.env.UPLOADER_URL || "//uploader.workadventure.localhost";
const ICON_URL = process.env.ICON_URL || "//icon.workadventure.localhost";
const STUN_SERVER: string = process.env.STUN_SERVER || "stun:stun.l.google.com:19302";
const TURN_SERVER: string = process.env.TURN_SERVER || "";
const SKIP_RENDER_OPTIMIZATIONS: boolean = process.env.SKIP_RENDER_OPTIMIZATIONS == "true";
const DISABLE_NOTIFICATIONS: boolean = process.env.DISABLE_NOTIFICATIONS == "true";
const TURN_USER: string = process.env.TURN_USER || "";
const TURN_PASSWORD: string = process.env.TURN_PASSWORD || "";
const JITSI_URL: string | undefined = process.env.JITSI_URL === "" ? undefined : process.env.JITSI_URL;
const JITSI_PRIVATE_MODE: boolean = process.env.JITSI_PRIVATE_MODE == "true";
const POSITION_DELAY = 200; // Wait 200ms between sending position events
const MAX_EXTRAPOLATION_TIME = 100; // Extrapolate a maximum of 250ms if no new movement is sent by the player
export const MAX_USERNAME_LENGTH = parseInt(process.env.MAX_USERNAME_LENGTH || "") || 8;
export const MAX_PER_GROUP = parseInt(process.env.MAX_PER_GROUP || "4");
export const DISPLAY_TERMS_OF_USE = process.env.DISPLAY_TERMS_OF_USE == "true";
export const NODE_ENV = process.env.NODE_ENV || "development";
export const CONTACT_URL = process.env.CONTACT_URL || undefined;
export const PROFILE_URL = process.env.PROFILE_URL || undefined;
export const POSTHOG_API_KEY: string = (process.env.POSTHOG_API_KEY as string) || "";
export const POSTHOG_URL = process.env.POSTHOG_URL || undefined;
export const DISABLE_ANONYMOUS: boolean = process.env.DISABLE_ANONYMOUS === "true";
export const OPID_LOGIN_SCREEN_PROVIDER = process.env.OPID_LOGIN_SCREEN_PROVIDER;
const FALLBACK_LANGUAGE: string = process.env.FALLBACK_LANGUAGE || "en-US";

export const isMobile = (): boolean => window.innerWidth <= 800 || window.innerHeight <= 600;

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
    FALLBACK_LANGUAGE,
};
