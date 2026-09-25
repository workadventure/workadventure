import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";
import Map from "./utils/map";
import Menu from "./utils/menu";
import { publicTestMapUrl } from "./utils/urls";
import { getPage } from "./utils/auth";
import { isMobile } from "./utils/isMobile";

// Only 2 of the 3 video boxes fit in the cameras container: a 1200x900 window, a cameras container taking 40% of
// the height (2 boxes per row, 1 row visible) and at most 2 videos per page.
const twoVisibleVideos = {
    pageCreatedHook: async (page: Page) => {
        await page.setViewportSize({ width: 1200, height: 900 });
        await page.addInitScript(() => {
            localStorage.setItem("cameraContainerHeight", "0.4");
            // window.env is set by an inline script of the page: patch it as soon as it is assigned.
            Object.defineProperty(window, "env", {
                configurable: true,
                set(value: { MAX_DISPLAYED_VIDEOS: number }) {
                    value.MAX_DISPLAYED_VIDEOS = 2;
                    Object.defineProperty(window, "env", { value, writable: true, configurable: true });
                },
            });
        });
    },
};

test.describe("Cameras container order @nomobile @nowebkit @nofirefox", () => {
    test("a participant who turns their camera on replaces a participant without camera", async ({
        browser,
        browserName,
        page,
    }) => {
        test.skip(
            browserName !== "chromium" || isMobile(page),
            "Layout logic, independent of the browser: only run on desktop Chromium",
        );

        const url = publicTestMapUrl("tests/E2E/empty.json", "camera_order");

        await using alice = await getPage(browser, "Alice", url, twoVisibleVideos);
        await Menu.turnOffCamera(alice);
        await Map.teleportToPosition(alice, 160, 160);

        await using bob = await getPage(browser, "Bob", url, twoVisibleVideos);
        await Menu.turnOffCamera(bob);
        await Map.teleportToPosition(bob, 160, 160);
        await expect(bob.locator("#cameras-container .camera-box")).toHaveCount(2, { timeout: 30_000 });

        await using carol = await getPage(browser, "Carol", url, twoVisibleVideos);
        await Menu.turnOffCamera(carol);
        await Map.teleportToPosition(carol, 160, 160);

        const camerasContainer = bob.locator("#cameras-container");
        await expect(camerasContainer.locator(".camera-box")).toHaveCount(3, { timeout: 30_000 });

        // Nobody has a camera: Carol arrived last, so she is the one out of view (off-screen boxes render no name).
        await expect(camerasContainer.getByText("Alice")).toBeInViewport({ timeout: 20_000 });
        await expect(camerasContainer.getByText("Carol")).toHaveCount(0);

        // Remember the DOM position of each box: reordering must only change the CSS "order" of the boxes, never
        // move or recreate their DOM nodes (it would interrupt the video streams).
        await camerasContainer.evaluate((container) => {
            [...container.children].forEach((child, index) => child.setAttribute("data-e2e-dom-index", `${index}`));
        });

        await Menu.turnOnCamera(carol);

        // Carol now has a camera: she takes Alice's place in view.
        await expect(camerasContainer.getByText("Carol")).toBeInViewport({ timeout: 20_000 });
        await expect(camerasContainer.getByText("Alice")).toHaveCount(0);

        const domIndexes = await camerasContainer.evaluate((container) =>
            [...container.children].map((child, index) => [child.getAttribute("data-e2e-dom-index"), `${index}`]),
        );
        for (const [previousIndex, index] of domIndexes) {
            expect(previousIndex).toBe(index);
        }
    });
});
