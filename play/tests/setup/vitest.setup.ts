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

// Setup window.env for browser tests
if (typeof window !== "undefined" && !window.env) {
    //@ts-ignore Setting up environment variables for tests
    window.env = {
        API_URL: "http://localhost:3000",
        FALLBACK_LOCALE: "en-US",
        DEBUG_MODE: false,
        NODE_ENV: "test",
        MAX_USERNAME_LENGTH: 10,
        MAX_PER_GROUP: 4,
        MAX_DISPLAYED_VIDEOS: 8,
        ENABLE_MAP_EDITOR: false,
        SKIP_RENDER_OPTIMIZATIONS: false,
        DISABLE_NOTIFICATIONS: false,
        DISABLE_ANONYMOUS: false,
        ENABLE_OPENID: false,
        ENABLE_CHAT: false,
        ENABLE_CHAT_UPLOAD: false,
        ENABLE_CHAT_ONLINE_LIST: false,
        ENABLE_CHAT_DISCONNECTED_LIST: false,
        ENABLE_SAY: false,
        ENABLE_ISSUE_REPORT: false,
        ENABLE_REPORT_ISSUES_MENU: false,
        JITSI_PRIVATE_MODE: false,
        FEATURE_FLAG_BROADCAST_AREAS: false,
        KLAXOON_ENABLED: false,
        YOUTUBE_ENABLED: false,
        GOOGLE_DRIVE_ENABLED: false,
        GOOGLE_DOCS_ENABLED: false,
        GOOGLE_SHEETS_ENABLED: false,
        GOOGLE_SLIDES_ENABLED: false,
        ERASER_ENABLED: false,
        EXCALIDRAW_ENABLED: false,
        CARDS_ENABLED: false,
        TLDRAW_ENABLED: false,
        WOKA_SPEED: 5,
        PUSHER_URL: "",
        ADMIN_URL: "",
        UPLOADER_URL: "",
        ICON_URL: "",
        JITSI_URL: "",
        CONTACT_URL: "",
        POSTHOG_API_KEY: "",
        POSTHOG_URL: "",
        OPID_PROFILE_SCREEN_PROVIDER: "",
        OPID_WOKA_NAME_POLICY: "",
        REPORT_ISSUES_URL: "",
        PEER_VIDEO_LOW_BANDWIDTH: 150,
        PEER_VIDEO_RECOMMENDED_BANDWIDTH: 300,
        PEER_SCREEN_SHARE_LOW_BANDWIDTH: 250,
        PEER_SCREEN_SHARE_RECOMMENDED_BANDWIDTH: 500,
        SENTRY_DSN_FRONT: "",
        SENTRY_ENVIRONMENT: "test",
        SENTRY_RELEASE: "",
        SENTRY_TRACES_SAMPLE_RATE: 0,
        EXCALIDRAW_DOMAINS: "",
        GOOGLE_DRIVE_PICKER_CLIENT_ID: "",
        GOOGLE_DRIVE_PICKER_APP_ID: "",
        PUBLIC_MAP_STORAGE_PREFIX: "",
        EMBEDLY_KEY: "",
        MATRIX_PUBLIC_URI: "",
        MATRIX_ADMIN_USER: "",
        MATRIX_DOMAIN: "",
        KLAXOON_CLIENT_ID: "",
        GRPC_MAX_MESSAGE_SIZE: 1024 * 1024 * 4,
    };
}
