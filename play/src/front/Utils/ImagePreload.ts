/** The images of the loader, login and error screens. */
export interface RoomImages {
    loadingLogo: string;
    backgroundSceneImage: string;
    errorSceneLogo: string;
}

/**
 * Picks the image each screen will display for a room: the one provided by the admin API when the room is branded,
 * the default one shipped with the front otherwise. This is the same fallback as the loader, login and error screens.
 *
 * Preloading these, and only these, avoids downloading default images that a branded room never shows.
 */
export function pickRoomImages(room: Partial<RoomImages>, defaults: RoomImages): RoomImages {
    return {
        loadingLogo: room.loadingLogo ?? defaults.loadingLogo,
        backgroundSceneImage: room.backgroundSceneImage ?? defaults.backgroundSceneImage,
        errorSceneLogo: room.errorSceneLogo ?? defaults.errorSceneLogo,
    };
}

// The longest the download of an image waits for the browser to be idle.
const MAX_IDLE_DELAY_MS = 5_000;

/**
 * Downloads an image into the HTTP cache once the browser is idle, so that a screen that needs it later finds it
 * without a network round trip (the error screen is typically shown because the connection dropped), without
 * competing with the boot of the game for bandwidth.
 *
 * Returns a function that cancels the download if it did not start yet.
 */
export function warmUpImageWhenIdle(url: string): () => void {
    const download = () => {
        const image = new Image();
        image.src = url;
    };

    if (typeof requestIdleCallback === "function") {
        const handle = requestIdleCallback(download, { timeout: MAX_IDLE_DELAY_MS });
        return () => cancelIdleCallback(handle);
    }

    // Safari does not implement requestIdleCallback.
    const timeout = setTimeout(download, MAX_IDLE_DELAY_MS);
    return () => clearTimeout(timeout);
}
