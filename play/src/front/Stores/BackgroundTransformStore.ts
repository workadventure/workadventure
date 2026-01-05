import { writable, derived } from "svelte/store";
import { localUserStore } from "../Connection/LocalUserStore";
import type { BackgroundConfig, BackgroundMode } from "../WebRtc/BackgroundProcessor/createBackgroundTransformer";
import { analyticsClient } from "../Administration/AnalyticsClient";

/**
 * Store for background transformation settings
 */
function createBackgroundConfigStore() {
    const initialConfig: BackgroundConfig = {
        mode: (localUserStore.getBackgroundMode() as BackgroundMode) || "none", // Default to blur for testing
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
                analyticsClient.settingBackground(mode);
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
        {
            name: "library",
            url: "./static/images/background/library.jpg",
            thumbnail: "./static/images/background/thumbnail/library.jpg",
        },
        {
            name: "Office",
            url: "./static/images/background/office.jpg",
            thumbnail: "./static/images/background/thumbnail/office.jpg",
        },
        {
            name: "Office 2",
            url: "./static/images/background/office_2.jpg",
            thumbnail: "./static/images/background/thumbnail/office_2.jpg",
        },
        {
            name: "Pixel Art",
            url: "./static/images/background/pixel_art.jpg",
            thumbnail: "./static/images/background/thumbnail/pixel_art.jpg",
        },
        {
            name: "Paysage",
            url: "./static/images/background/paysage.jpg",
            thumbnail: "./static/images/background/thumbnail/paysage.jpg",
        },
        {
            name: "Paysage 2",
            url: "./static/images/background/paysage_2.jpg",
            thumbnail: "./static/images/background/thumbnail/paysage_2.jpg",
        },
        {
            name: "Paysage 3",
            url: "./static/images/background/paysage_3.jpg",
            thumbnail: "./static/images/background/thumbnail/paysage_3.jpg",
        },
        {
            name: "Paysage 4",
            url: "./static/images/background/paysage_4.jpg",
            thumbnail: "./static/images/background/thumbnail/paysage_4.jpg",
        },
        {
            name: "Milkyway",
            url: "./static/images/background/Milkyway.jpg",
            thumbnail: "./static/images/background/thumbnail/Milkyway.jpg",
        },
        {
            name: "Chetwode Blue",
            url: "./static/images/background/ChetwodeBlue.jpg",
            thumbnail: "./static/images/background/thumbnail/ChetwodeBlue.jpg",
        },
        {
            name: "Fuchsia",
            url: "./static/images/background/Fuchsia.jpg",
            thumbnail: "./static/images/background/thumbnail/Fuchsia.jpg",
        },
        {
            name: "Ronchi",
            url: "./static/images/background/Ronchi.jpg",
            thumbnail: "./static/images/background/thumbnail/Ronchi.jpg",
        },
    ],
    videos: [
        {
            name: "Waterfall",
            url: "./static/Videos/background/waterfall.mp4",
            thumbnail: "./static/Videos/background/thumbnail/waterfall.jpg",
        },
        {
            name: "Stars",
            url: "./static/Videos/background/stars.mp4",
            thumbnail: "./static/Videos/background/thumbnail/stars.jpg",
        },
        {
            name: "Matrix",
            url: "./static/Videos/background/matrix.mp4",
            thumbnail: "./static/Videos/background/thumbnail/matrix.jpg",
        },
    ],
};
