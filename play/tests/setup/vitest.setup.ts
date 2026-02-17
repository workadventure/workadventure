import type { FrontConfigurationInterface } from "../../src/common/FrontConfigurationInterface";

// Vitest setup: provide a minimal MediaStream polyfill for Node test environment

class MediaStreamPolyfill {
    constructor(_tracks?: unknown[]) {}
    getTracks(): unknown[] {
        return [];
    }
    getAudioTracks(): unknown[] {
        return [];
    }
    getVideoTracks(): unknown[] {
        return [];
    }
    addTrack(_track: unknown): void {}
    removeTrack(_track: unknown): void {}
}

if (typeof globalThis.MediaStream === "undefined") {
    globalThis.MediaStream = MediaStreamPolyfill as unknown as typeof MediaStream;
}

if (typeof window !== "undefined" && window.env === undefined) {
    const defaultEnv: FrontConfigurationInterface = {
        DEBUG_MODE: false,
        PUSHER_URL: "http://pusher.test",
        FRONT_URL: "http://front.test",
        ADMIN_URL: undefined,
        UPLOADER_URL: "http://uploader.test",
        ICON_URL: "http://icon.test",
        SKIP_RENDER_OPTIMIZATIONS: false,
        DISABLE_NOTIFICATIONS: false,
        JITSI_URL: undefined,
        JITSI_PRIVATE_MODE: false,
        ENABLE_MAP_EDITOR: true,
        PUBLIC_MAP_STORAGE_PREFIX: undefined,
        MAX_USERNAME_LENGTH: 20,
        MAX_PER_GROUP: 4,
        MAX_DISPLAYED_VIDEOS: 4,
        NODE_ENV: "test",
        CONTACT_URL: undefined,
        POSTHOG_API_KEY: undefined,
        POSTHOG_URL: undefined,
        DISABLE_ANONYMOUS: false,
        ENABLE_OPENID: false,
        OPID_PROFILE_SCREEN_PROVIDER: undefined,
        ENABLE_CHAT_UPLOAD: false,
        FALLBACK_LOCALE: "en",
        OPID_WOKA_NAME_POLICY: undefined,
        ENABLE_REPORT_ISSUES_MENU: undefined,
        REPORT_ISSUES_URL: undefined,
        SENTRY_DSN_FRONT: undefined,
        SENTRY_DSN_PUSHER: undefined,
        SENTRY_ENVIRONMENT: undefined,
        SENTRY_RELEASE: undefined,
        SENTRY_TRACES_SAMPLE_RATE: undefined,
        WOKA_SPEED: 8,
        FEATURE_FLAG_BROADCAST_AREAS: false,
        KLAXOON_ENABLED: false,
        KLAXOON_CLIENT_ID: undefined,
        YOUTUBE_ENABLED: false,
        GOOGLE_DRIVE_ENABLED: false,
        GOOGLE_DOCS_ENABLED: false,
        GOOGLE_SHEETS_ENABLED: false,
        GOOGLE_SLIDES_ENABLED: false,
        ERASER_ENABLED: false,
        MINIMUM_DISTANCE: 2,
        GOOGLE_DRIVE_PICKER_CLIENT_ID: undefined,
        GOOGLE_DRIVE_PICKER_APP_ID: undefined,
        EXCALIDRAW_ENABLED: false,
        EXCALIDRAW_DOMAINS: [],
        CARDS_ENABLED: false,
        TLDRAW_ENABLED: false,
        EMBEDLY_KEY: undefined,
        MATRIX_PUBLIC_URI: undefined,
        MATRIX_ADMIN_USER: undefined,
        MATRIX_DOMAIN: undefined,
        ENABLE_CHAT: undefined,
        ENABLE_CHAT_ONLINE_LIST: undefined,
        ENABLE_CHAT_DISCONNECTED_LIST: undefined,
        ENABLE_SAY: undefined,
        ENABLE_ISSUE_REPORT: undefined,
        GRPC_MAX_MESSAGE_SIZE: 4194304,
        TURN_CREDENTIALS_RENEWAL_TIME: 0,
        BACKGROUND_TRANSFORMER_ENGINE: undefined,
        DEFAULT_WOKA_NAME: undefined,
        DEFAULT_WOKA_TEXTURE: undefined,
        SKIP_CAMERA_PAGE: undefined,
        PROVIDE_DEFAULT_WOKA_NAME: undefined,
        PROVIDE_DEFAULT_WOKA_TEXTURE: undefined,
    };

    window.env = defaultEnv;
}

// jsdom does not implement CanvasRenderingContext2D; Phaser expects it during import.
// Provide a minimal stub so canvas feature detection does not crash in tests.
const createStubContext = () => {
    const data = new Uint8ClampedArray([0, 0, 0, 255]);
    return {
        fillStyle: "",
        globalCompositeOperation: "source-over",
        drawImage: () => undefined,
        fillRect: () => undefined,
        getImageData: () => ({ data }),
        putImageData: () => undefined,
    } as unknown as CanvasRenderingContext2D;
};

// @ts-ignore Override getContext to return our stub instead of throwing "not implemented".
HTMLCanvasElement.prototype.getContext = function getContext() {
    return createStubContext();
};
