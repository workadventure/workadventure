import { writable, derived } from "svelte/store";
import { localUserStore } from "../Connection/LocalUserStore";
import { BackgroundConfig, BackgroundMode } from "../WebRtc/BackgroundProcessor/MediaPipeBackgroundTransformer";

/**
 * Store for background transformation settings
 */
function createBackgroundConfigStore() {
    const initialConfig: BackgroundConfig = {
        mode: (localUserStore.getBackgroundMode() as BackgroundMode) || "blur", // Default to blur for testing
        blurAmount: localUserStore.getBackgroundBlurAmount() || 15, // Nice blur amount for testing
        backgroundImage: localUserStore.getBackgroundImage() || undefined,
        backgroundVideo: localUserStore.getBackgroundVideo() || undefined,
    };

    const { subscribe, set, update } = writable<BackgroundConfig>(initialConfig);

    return {
        subscribe,
        setMode: (mode: BackgroundMode) => {
            update((config) => {
                const newConfig = { ...config, mode };
                localUserStore.setBackgroundMode(mode);
                return newConfig;
            });
        },
        setBlurAmount: (amount: number) => {
            update((config) => {
                const newConfig = { ...config, blurAmount: amount };
                localUserStore.setBackgroundBlurAmount(amount);
                return newConfig;
            });
        },
        setBackgroundImage: (imageUrl: string) => {
            update((config) => {
                const newConfig = { ...config, backgroundImage: imageUrl, mode: "image" as BackgroundMode };
                localUserStore.setBackgroundImage(imageUrl);
                localUserStore.setBackgroundMode("image");
                return newConfig;
            });
        },
        setBackgroundVideo: (videoUrl: string) => {
            update((config) => {
                const newConfig = { ...config, backgroundVideo: videoUrl, mode: "video" as BackgroundMode };
                localUserStore.setBackgroundVideo(videoUrl);
                localUserStore.setBackgroundMode("video");
                return newConfig;
            });
        },
        reset: () => {
            const resetConfig = { ...initialConfig, mode: "none" as BackgroundMode };
            set(resetConfig);
            localUserStore.setBackgroundMode("none");
        },
    };
}

export const backgroundConfigStore = createBackgroundConfigStore();

/**
 * Store indicating if background processing is enabled
 */
export const backgroundProcessingEnabledStore = derived(
    backgroundConfigStore,
    ($backgroundConfig) => $backgroundConfig.mode !== "none"
);

/**
 * Store indicating if MediaPipe is supported
 */
export const mediaPipeSupported = writable(true); // Will be updated after checking browser support

/**
 * Predefined background options
 */
export const backgroundPresets = {
    images: [
        { name: "Office", url: "./static/images/default-companion.png" },
        { name: "Living Room", url: "./static/images/default-companion.png" },
        { name: "Nature", url: "./static/images/logo-wa-2.png" },
        { name: "City", url: "./static/images/think-bubble.png" },
        { name: "Abstract", url: "./static/images/say-bubble.png" },
    ],
    videos: [
        { name: "Smileys", url: "./static/Videos/Smileys.mp4" },
        { name: "Waves", url: "./static/Videos/Follow.mp4" },
        { name: "Fireplace", url: "./static/Videos/Chat.mp4" },
    ],
};

/**
 * Store for background processing performance metrics
 */
export const backgroundProcessingMetricsStore = writable({
    fps: 0,
    processingTime: 0,
    isProcessing: false,
});
