import { expect, test } from "@playwright/test";
import Map from "../utils/map";
import { play_url } from "../utils/urls";
import { getPage } from "../utils/auth";
import { isMobileViewport } from "../utils/isMobile";
import { gameToBrowserCoordinates } from "../utils/gameCoordinates";

test.use({
    baseURL: play_url,
});

test.describe("Touch navigation @nowebkit @nodesktop", () => {
    test.beforeEach(async ({ viewport, browserName }) => {
        // Drags and two-finger touches are sent through the Chrome DevTools Protocol.
        test.skip(!isMobileViewport(viewport) || browserName !== "chromium", "Run only on mobile Chromium");
    });

    test("a drag or a two-finger touch moves no one, a tap walks there", async ({ browser }) => {
        await using page = await getPage(browser, "Alice", Map.url("empty"));
        await Map.teleportToPosition(page, 2 * 32, 2 * 32);
        const start = await Map.getPosition(page);
        const destination = { x: 6 * 32, y: 6 * 32 };
        const target = await gameToBrowserCoordinates(page, destination);

        const cdp = await page.context().newCDPSession(page);
        const touch = (type: "touchStart" | "touchMove" | "touchEnd", points: { x: number; y: number }[]) =>
            cdp.send("Input.dispatchTouchEvent", {
                type,
                touchPoints: points.map((point, id) => ({ x: point.x, y: point.y, id })),
            });

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
});
