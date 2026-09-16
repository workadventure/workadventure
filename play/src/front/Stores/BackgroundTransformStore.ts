import { writable, derived, readable } from "svelte/store";
import { localUserStore } from "../Connection/LocalUserStore";
import {
    getBackgroundProcessingUnsupportedReason,
    isBackgroundMode,
    type BackgroundConfig,
    type BackgroundMode,
} from "../WebRtc/BackgroundProcessor/createBackgroundTransformer";
import { analyticsClient } from "../Administration/AnalyticsClient";

/**
 * Store for background transformation settings
 */
function createBackgroundConfigStore() {
    // A stored mode that no longer exists (e.g. the removed "video" mode) falls back to "none".
    const storedMode = localUserStore.getBackgroundMode();
    const initialConfig: BackgroundConfig = {
        mode: isBackgroundMode(storedMode) ? storedMode : "none",
        blurAmount: localUserStore.getBackgroundBlurAmount() || 15,
        backgroundImage: localUserStore.getBackgroundImage() || undefined,
    };

    const { subscribe, set, update } = writable<BackgroundConfig>(initialConfig);

    return {
        subscribe,
        setMode: (mode: BackgroundMode) => {
            update((config) => {
                const newConfig = { ...config, mode };
                localUserStore.setBackgroundMode(mode);
                analyticsClient.trackAdminEvent("settings.background.changed", { backgroundType: mode });
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
    ($backgroundConfig) => $backgroundConfig.mode !== "none",
);

/**
 * Whether this device can run background effects at all. Probed on first subscription (it creates a WebGL2
 * context), so opening the settings panel is what pays for it.
 */
export const backgroundProcessingSupportedStore = readable(true, (set) => {
    set(getBackgroundProcessingUnsupportedReason() === null);
});

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
};
