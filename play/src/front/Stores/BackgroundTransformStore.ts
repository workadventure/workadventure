import { writable, derived, readable, get } from "svelte/store";
import { localUserStore } from "../Connection/LocalUserStore";
import {
    getBackgroundProcessingUnsupportedReason,
    isBackgroundMode,
    type BackgroundConfig,
    type BackgroundMode,
} from "../WebRtc/BackgroundProcessor/createBackgroundTransformer";
import { analyticsClient } from "../Administration/AnalyticsClient";
import { currentRoomStore } from "./CurrentRoomStore";
import { getAvailableBackgroundImages } from "./BackgroundPresets";

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

/** The background images offered in the settings panel, as customized by the current world. */
export const availableBackgroundImagesStore = derived(currentRoomStore, ($room) =>
    getAvailableBackgroundImages($room?.cameraBackgrounds),
);

// Once the world's list is known, a selected image the admin hid or deleted falls back to no background.
// Lives as long as the app, like the store itself.
// eslint-disable-next-line svelte/no-ignored-unsubscribe
currentRoomStore.subscribe(($room) => {
    if (!$room) return;
    const config = get(backgroundConfigStore);
    if (config.mode !== "image") return;
    const images = getAvailableBackgroundImages($room.cameraBackgrounds);
    if (!images.some((image) => image.url === config.backgroundImage)) {
        backgroundConfigStore.reset();
    }
});
