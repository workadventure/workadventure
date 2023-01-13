import type { OpidWokaNamePolicy } from "@workadventure/messages";

export interface FrontConfigurationInterface {
    DEBUG_MODE: boolean;
    PLAY_URL: string;
    ADMIN_URL: string | undefined;
    UPLOADER_URL: string;
    ICON_URL: string;
    STUN_SERVER: string | undefined;
    TURN_SERVER: string | undefined;
    SKIP_RENDER_OPTIMIZATIONS: boolean;
    DISABLE_NOTIFICATIONS: boolean;
    TURN_USER: string | undefined;
    TURN_PASSWORD: string | undefined;
    JITSI_URL: string | undefined;
    JITSI_PRIVATE_MODE: boolean;
    ENABLE_FEATURE_MAP_EDITOR: boolean;
    MAX_USERNAME_LENGTH: number;
    MAX_PER_GROUP: number;
    NODE_ENV: string;
    CONTACT_URL: string | undefined;
    POSTHOG_API_KEY: string | undefined;
    POSTHOG_URL: string | undefined;
    DISABLE_ANONYMOUS: boolean;
    ENABLE_OPENID: boolean;
    OPID_PROFILE_SCREEN_PROVIDER: string | undefined;
    OPID_LOGOUT_REDIRECT_URL: string | undefined;
    CHAT_URL: string | undefined;
    ENABLE_CHAT_UPLOAD: boolean;
    FALLBACK_LOCALE: string | undefined;
    OPID_WOKA_NAME_POLICY: OpidWokaNamePolicy | undefined;
}
