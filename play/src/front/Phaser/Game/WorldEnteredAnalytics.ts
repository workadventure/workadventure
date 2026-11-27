import type { AnalyticsEventProperties } from "@workadventure/messages";

/**
 * Read when the bundle is evaluated, as close to navigation start as this code gets. Phaser does not run in a hidden
 * tab, so a page opened in the background counts, in sinceNavigationStartMs, the time until the user looked at it.
 */
const pageStartedHidden = document.visibilityState === "hidden";

/**
 * The `world.entered` payload for a scene that just became playable.
 *
 * `now` and `sceneStartedAt` are `performance.now()` values, so `now` is also the time since navigation start.
 */
export function worldEnteredProperties(
    scene: {
        sceneStartedAt: number;
        firstLoad: boolean;
        reconnection: boolean;
        setupScreenShown: boolean;
        mapResource: PerformanceResourceTiming | undefined;
    },
    now = performance.now(),
): AnalyticsEventProperties<"world.entered"> {
    const properties: AnalyticsEventProperties<"world.entered"> = {
        durationMs: Math.round(now - scene.sceneStartedAt),
        firstLoad: scene.firstLoad,
        reconnection: scene.reconnection,
    };
    // Only the first scene of a page has a navigation to measure from.
    if (scene.firstLoad) {
        properties.sinceNavigationStartMs = Math.round(now);
        properties.setupScreenShown = scene.setupScreenShown;
        properties.openedInBackground = pageStartedHidden;
    }
    if (scene.mapResource) {
        properties.mapDownloadMs = Math.round(scene.mapResource.duration);
        // 0 means unknown: another origin that does not send Timing-Allow-Origin.
        if (scene.mapResource.encodedBodySize > 0) {
            properties.mapBytes = scene.mapResource.encodedBodySize;
        }
    }
    return properties;
}
