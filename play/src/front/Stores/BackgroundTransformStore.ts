import { writable, derived, readable, get } from "svelte/store";
import type { CameraBackgroundData } from "@workadventure/messages";
import { localUserStore } from "../Connection/LocalUserStore";
import {
    getBackgroundProcessingUnsupportedReason,
    isBackgroundMode,
    type BackgroundConfig,
    type BackgroundMode,
} from "../WebRtc/BackgroundProcessor/createBackgroundTransformer";
import { analyticsClient } from "../Administration/AnalyticsClient";
import { currentRoomStore } from "./CurrentRoomStore";

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

/** Offered when the admin sends no list. An admin may list these paths too, so don't rename the files. */
const defaultBackgroundImages: CameraBackgroundData[] = [
    "library.jpg",
    "office.jpg",
    "office_2.jpg",
    "pixel_art.jpg",
    "paysage.jpg",
    "paysage_2.jpg",
    "paysage_3.jpg",
    "paysage_4.jpg",
    "Milkyway.jpg",
    "ChetwodeBlue.jpg",
    "Fuchsia.jpg",
    "Ronchi.jpg",
].map((file) => ({
    url: `./static/images/background/${file}`,
    thumbnailUrl: `./static/images/background/thumbnail/${file}`,
}));

/** The background images offered in the settings panel: the world's list, or the built-in images without one. */
export const availableBackgroundImagesStore = derived(
    currentRoomStore,
    ($room) => $room?.cameraBackgrounds ?? defaultBackgroundImages,
);

// Once the world's list is known, a selected image the world no longer offers falls back to no background.
// Lives as long as the app, like the store itself.
// eslint-disable-next-line svelte/no-ignored-unsubscribe
currentRoomStore.subscribe(($room) => {
    if (!$room) return;
    const config = get(backgroundConfigStore);
    if (config.mode !== "image") return;
    const images = $room.cameraBackgrounds ?? defaultBackgroundImages;
    if (!images.some((image) => image.url === config.backgroundImage)) {
        backgroundConfigStore.reset();
    }
});
