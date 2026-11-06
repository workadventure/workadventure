import { describe, expect, it } from "vitest";
import { worldEnteredProperties } from "../../../../src/front/Phaser/Game/WorldEnteredAnalytics";

function mapResource(duration: number, encodedBodySize: number): PerformanceResourceTiming {
    return { duration, encodedBodySize } as PerformanceResourceTiming;
}

describe("worldEnteredProperties", () => {
    it("measures a first load from navigation start and from the scene start", () => {
        expect(
            worldEnteredProperties(
                {
                    sceneStartedAt: 2_400.4,
                    firstLoad: true,
                    reconnection: false,
                    setupScreenShown: false,
                    mapResource: mapResource(812.6, 1_048_576),
                },
                9_700.2,
            ),
        ).toEqual({
            durationMs: 7_300,
            firstLoad: true,
            reconnection: false,
            sinceNavigationStartMs: 9_700,
            setupScreenShown: false,
            openedInBackground: false,
            mapDownloadMs: 813,
            mapBytes: 1_048_576,
        });
    });

    it("leaves out what a room change cannot know", () => {
        // No navigation to measure from, and a map on another origin without Timing-Allow-Origin reports 0 bytes.
        expect(
            worldEnteredProperties(
                {
                    sceneStartedAt: 600_000,
                    firstLoad: false,
                    reconnection: false,
                    setupScreenShown: true,
                    mapResource: mapResource(300, 0),
                },
                603_500,
            ),
        ).toEqual({ durationMs: 3_500, firstLoad: false, reconnection: false, mapDownloadMs: 300 });
    });

    it("has no map timing when the map came from the cache of an earlier scene", () => {
        expect(
            worldEnteredProperties(
                {
                    sceneStartedAt: 1_000,
                    firstLoad: false,
                    reconnection: true,
                    setupScreenShown: false,
                    mapResource: undefined,
                },
                2_000,
            ),
        ).toEqual({ durationMs: 1_000, firstLoad: false, reconnection: true });
    });
});
