import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";
import Map from "../utils/map";
import { play_url, publicTestMapUrl } from "../utils/urls";
import { getPage } from "../utils/auth";
import { isMobileViewport } from "../utils/isMobile";
import { gameToBrowserCoordinates } from "../utils/gameCoordinates";

test.use({
    baseURL: play_url,
});

type Point = { x: number; y: number };

/**
 * Raw touch events (drags, two fingers) go through the Chrome DevTools Protocol. They don't trigger getPage's handler
 * that skips the onboarding, which opens shortly after the map loads: wait for it, and let an assertion skip it.
 */
async function touchscreen(page: Page) {
    const skip = page.getByTestId("onboarding-button-welcome-skip");
    await skip.waitFor({ state: "visible", timeout: 5_000 }).catch(() => undefined);
    await expect(skip).toBeHidden();

    const cdp = await page.context().newCDPSession(page);
    return (type: "touchStart" | "touchMove" | "touchEnd", points: Point[]) =>
        cdp.send("Input.dispatchTouchEvent", {
            type,
            touchPoints: points.map((point, id) => ({ x: point.x, y: point.y, id })),
        });
}

/** The map point under a browser position (the map-to-browser conversion is linear). */
async function mapPointAt(page: Page, position: Point): Promise<Point> {
    const origin = await gameToBrowserCoordinates(page, { x: 0, y: 0 });
    const far = await gameToBrowserCoordinates(page, { x: 1000, y: 1000 });
    return {
        x: ((position.x - origin.x) * 1000) / (far.x - origin.x),
        y: ((position.y - origin.y) * 1000) / (far.y - origin.y),
    };
}

test.describe("Touch navigation @nowebkit @nodesktop", () => {
    test.beforeEach(async ({ viewport, browserName }) => {
        test.skip(!isMobileViewport(viewport) || browserName !== "chromium", "Run only on mobile Chromium");
    });

    test("a drag or a two-finger touch moves no one, a tap walks there", async ({ browser }) => {
        await using page = await getPage(browser, "Alice", Map.url("empty"));
        const touch = await touchscreen(page);
        await Map.teleportToPosition(page, 2 * 32, 2 * 32);
        const start = await Map.getPosition(page);
        const destination = { x: 6 * 32, y: 6 * 32 };
        const target = await gameToBrowserCoordinates(page, destination);

        // A one-finger drag moves the view: the camera leaves the avatar, which stays put.
        await touch("touchStart", [target]);
        for (let step = 1; step <= 5; step++) {
            await touch("touchMove", [{ x: target.x - step * 12, y: target.y }]);
        }
        await touch("touchEnd", []);
        await expect(page.getByTestId("center-camera-on-player")).toBeAttached();

        // Lifting the fingers of a quick two-finger touch (the end of a pinch) is not a tap.
        await touch("touchStart", [target, { x: target.x + 40, y: target.y }]);
        await touch("touchEnd", []);

        // Give a mistaken walk time to start before checking that none did.
        // eslint-disable-next-line playwright/no-wait-for-timeout
        await page.waitForTimeout(1000);
        expect(await Map.getPosition(page)).toEqual(start);

        // A tap walks there.
        const tapAt = await gameToBrowserCoordinates(page, destination);
        await page.touchscreen.tap(tapAt.x, tapAt.y);
        await expect
            .poll(async () => {
                const position = await Map.getPosition(page);
                return Math.hypot(position.x - destination.x, position.y - destination.y);
            })
            .toBeLessThan(16);
    });

    test("two fingers keep the map under them while pinching and panning", async ({ browser }) => {
        // A map bigger than the screen, so the view can move in every direction.
        await using page = await getPage(browser, "Alice", publicTestMapUrl("tests/parallax.json", "touch_navigation"));
        const touch = await touchscreen(page);
        const viewport = page.viewportSize() ?? { width: 393, height: 727 };
        const centre = { x: viewport.width / 2, y: viewport.height / 2 };

        // Free the view with one finger, away from the map corner where the avatar starts.
        await touch("touchStart", [centre]);
        for (let step = 1; step <= 10; step++) {
            await touch("touchMove", [{ x: centre.x - step * 15, y: centre.y - step * 15 }]);
        }
        await touch("touchEnd", []);
        await expect(page.getByTestId("center-camera-on-player")).toBeAttached();

        /** Moves two fingers that start 80 px apart around the centre; each step moves them by `left` and `right`. */
        const twoFingers = async (left: Point, right: Point) => {
            const under = await mapPointAt(page, centre);
            const scale = async () =>
                (await gameToBrowserCoordinates(page, { x: 1000, y: 0 })).x -
                (await gameToBrowserCoordinates(page, { x: 0, y: 0 })).x;
            const scaleBefore = await scale();
            const steps = 12;
            await touch("touchStart", [
                { x: centre.x - 40, y: centre.y },
                { x: centre.x + 40, y: centre.y },
            ]);
            for (let step = 1; step <= steps; step++) {
                await touch("touchMove", [
                    { x: centre.x - 40 + step * left.x, y: centre.y + step * left.y },
                    { x: centre.x + 40 + step * right.x, y: centre.y + step * right.y },
                ]);
            }
            await touch("touchEnd", []);
            const between = {
                x: centre.x + (steps * (left.x + right.x)) / 2,
                y: centre.y + (steps * (left.y + right.y)) / 2,
            };
            const now = await gameToBrowserCoordinates(page, under);
            return {
                drift: Math.hypot(now.x - between.x, now.y - between.y),
                zoom: (await scale()) / scaleBefore,
                spread: (80 + steps * (right.x - left.x)) / 80,
            };
        };

        // Both fingers moving together: the map follows them.
        const pan = await twoFingers({ x: -10, y: -5 }, { x: -10, y: -5 });
        expect(pan.drift).toBeLessThan(5);

        // Pinching apart: the map zooms by the fingers' spread, around the point between them.
        const pinch = await twoFingers({ x: -3, y: 0 }, { x: 3, y: 0 });
        expect(pinch.drift).toBeLessThan(5);
        expect(pinch.zoom).toBeCloseTo(pinch.spread, 1);
    });
});
