import type { Page } from "@playwright/test";
import { expect, test } from "@playwright/test";
import Map from "../utils/map.ts";
import AreaEditor from "../utils/map-editor/areaEditor.ts";
import { resetWamMaps } from "../utils/map-editor/uploader.ts";
import MapEditor from "../utils/mapeditor.ts";
import Menu from "../utils/menu.ts";
import { map_storage_url } from "../utils/urls.ts";
import { getPage } from "../utils/auth.ts";
import { isMobile } from "../utils/isMobile.ts";
import { evaluateScript } from "../utils/scripting.ts";

test.setTimeout(240_000); // Fix Webkit that can take more than 60s
test.use({
    baseURL: map_storage_url,
});

async function skipOnboardingIfVisible(page: Page) {
    await evaluateScript(page, async () => {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        await WA.onInit();
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        WA.player.state.tutorialDone = true;
    });

    const onboardingStep = page.getByTestId("onboarding-step");
    const skipButton = page.getByTestId("onboarding-button-welcome-skip");
    for (let attempt = 0; attempt < 5; attempt += 1) {
        const isSkipButtonVisible = await skipButton.isVisible().catch(() => false);
        if (!isSkipButtonVisible) {
            return;
        }

        if (await onboardingStep.isVisible().catch(() => false)) {
            await skipButton.click();
        } else {
            await page.keyboard.press("Escape");
        }

        // eslint-disable-next-line playwright/no-wait-for-timeout
        await page.waitForTimeout(300);
    }
    await expect(skipButton).toBeHidden();
}

test.describe("Map editor max users in area @oidc @nomobile @nowebkit", () => {
    test.beforeEach("Ignore tests on mobile because map editor not available for mobile devices", ({ page }) => {
        // Map Editor not available on mobile
        test.skip(isMobile(page), "Map editor is not available on mobile");
    });

    test.beforeEach("Ignore tests on webkit because of issue with camera and microphone", ({ browserName }) => {
        // WebKit has issue with camera
        test.skip(browserName === "webkit", "WebKit has issues with camera/microphone");
    });

    test("Area with max users=1 blocks second user and allows entry after first user leaves", async ({
        browser,
        request,
    }) => {
        await resetWamMaps(request);
        await using page = await getPage(browser, "Admin1", Map.url("empty"));
        const areaLeftBoundX = 1 * 32 * 1.5;

        await skipOnboardingIfVisible(page);

        // Create an area next to spawn and set max users to 1.
        await Menu.openMapEditor(page);
        await skipOnboardingIfVisible(page);
        await MapEditor.openAreaEditor(page);
        await AreaEditor.drawArea(page, { x: 1 * 32 * 1.5, y: 2 * 32 * 1.5 }, { x: 9 * 32 * 1.5, y: 7 * 32 * 1.5 });
        await AreaEditor.addProperty(page, "maxUsersInAreaPropertyData");

        const maxUsersInput = page.locator("#maxUsersInArea");
        await expect(maxUsersInput).toBeVisible();
        await maxUsersInput.fill("1");
        await maxUsersInput.blur();
        await Menu.closeMapEditor(page);

        // Admin enters the area and occupies the only available spot.
        await Map.teleportToPosition(page, 4 * 32 * 1.5, 4 * 32 * 1.5);

        // Alice cannot enter while Admin is inside.
        await using page2 = await getPage(browser, "Alice", Map.url("empty"));
        await skipOnboardingIfVisible(page2);
        const aliceStartPosition = await Map.getPosition(page2);
        await Map.walkTo(page2, "ArrowRight", 1000);

        await expect(page2.getByText("This area is full. You cannot enter.")).toBeAttached();
        const aliceBlockedPosition = await Map.getPosition(page2);
        expect(aliceBlockedPosition.x).toBeLessThanOrEqual(areaLeftBoundX);

        // Once Admin leaves, Alice can enter.
        await Map.teleportToPosition(page, 0, 3 * 32);
        await Map.teleportToPosition(page2, aliceStartPosition.x, aliceStartPosition.y);
        // eslint-disable-next-line playwright/no-wait-for-timeout
        await page2.waitForTimeout(1000);
        await Map.walkTo(page2, "ArrowRight", 1000);

        const alicePositionAfterAdminLeaves = await Map.getPosition(page2);
        expect(alicePositionAfterAdminLeaves.x).toBeGreaterThan(areaLeftBoundX);
    });
});
