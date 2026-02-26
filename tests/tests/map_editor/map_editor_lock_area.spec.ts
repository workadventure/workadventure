import { expect, test } from "@playwright/test";
import Map from "../utils/map";
import AreaEditor from "../utils/map-editor/areaEditor";
import { resetWamMaps } from "../utils/map-editor/uploader";
import MapEditor from "../utils/mapeditor";
import Menu from "../utils/menu";
import { map_storage_url } from "../utils/urls";
import { getPage } from "../utils/auth";
import { isMobile } from "../utils/isMobile";

test.setTimeout(240_000); // Fix Webkit that can take more than 60s
test.use({
    baseURL: map_storage_url,
});

test.describe("Map editor lockable area @oidc @nomobile @nowebkit", () => {
    test.beforeEach("Ignore tests on mobile because map editor not available for mobile devices", ({ page }) => {
        // Map Editor not available on mobile
        test.skip(isMobile(page), "Map editor is not available on mobile");
    });

    test.beforeEach("Ignore tests on webkit because of issue with camera and microphone", ({ browserName }) => {
        // WebKit has issue with camera
        test.skip(browserName === "webkit", "WebKit has issues with camera/microphone");
    });

    test("Lock area prevents entry, unlocks when empty, and can be admin-unlocked with SPACE", async ({
        browser,
        request,
    }) => {
        await resetWamMaps(request);
        await using page = await getPage(browser, "Admin1", Map.url("empty"));
        const areaLeftBoundX = 1 * 32 * 1.5;

        // Create an area just to the right of the spawn and make it lockable.
        await Menu.openMapEditor(page);
        await MapEditor.openAreaEditor(page);
        await AreaEditor.drawArea(page, { x: 1 * 32 * 1.5, y: 2 * 32 * 1.5 }, { x: 9 * 32 * 1.5, y: 7 * 32 * 1.5 });
        await AreaEditor.addProperty(page, "lockableAreaPropertyData");
        await Menu.closeMapEditor(page);

        // Move admin in the area and lock it.
        await Map.teleportToPosition(page, 4 * 32 * 1.5, 4 * 32 * 1.5);
        await expect(page.getByTestId("lock-button")).toBeVisible();
        await page.getByTestId("lock-button").click();
        await expect(page.getByTestId("lock-button")).toHaveClass(/bg-danger/);

        // Alice tries to enter the locked area with keyboard and is blocked with the correct message.
        await using page2 = await getPage(browser, "Alice", Map.url("empty"));
        const aliceStartPosition = await Map.getPosition(page2);
        await Map.walkTo(page2, "ArrowRight", 1000);

        await expect(page2.getByText("This area is locked. You cannot enter.")).toBeAttached();

        // Alice tries to enter using a right-click and is also blocked with the correct message.
        await Map.walkToPosition(page2, 4 * 32, 4 * 32)
            .then(() => {
                throw new Error("Alice should not be able to move into the locked area");
            })
            .catch(() => {
                // Expected to fail because area is locked
            });

        // Admin unlocks the area and Alice can now enter it.
        await page.getByTestId("lock-button").click();
        await expect(page.getByTestId("lock-button")).not.toHaveClass(/bg-danger/);

        await Map.walkTo(page2, "ArrowRight", 500);
        const alicePositionAfterUnlock = await Map.getPosition(page2);
        expect(alicePositionAfterUnlock.x).toBeGreaterThan(areaLeftBoundX);

        // Reset Alice position before checking auto-unlock when the area becomes empty.
        await Map.teleportToPosition(page2, aliceStartPosition.x, aliceStartPosition.y);

        // Admin locks again, then leaves the area: lock should auto-clear when area is empty.
        await page.getByTestId("lock-button").click();
        await expect(page.getByTestId("lock-button")).toHaveClass(/bg-danger/);
        await Map.teleportToPosition(page, 0, 3 * 32);

        await Map.walkTo(page2, "ArrowRight", 500);
        const alicePositionAfterAutoUnlock = await Map.getPosition(page2);
        expect(alicePositionAfterAutoUnlock.x).toBeGreaterThan(areaLeftBoundX);

        // Alice locks the area again.
        await expect(page2.getByTestId("lock-button")).toBeVisible();
        await page2.getByTestId("lock-button").click();
        await expect(page2.getByTestId("lock-button")).toHaveClass(/bg-danger/);

        // Admin is blocked, sees the admin-specific unlock message, then unlocks with SPACE.
        await Map.walkTo(page, "ArrowRight", 500);
        await expect(page.getByText(/unlock this area\./i)).toBeAttached();
        await page.keyboard.press("Space");

        // After unlocking with SPACE, admin can enter the area.
        await Map.walkTo(page, "ArrowRight", 500);
        const adminPositionAfterSpaceUnlock = await Map.getPosition(page);
        expect(adminPositionAfterSpaceUnlock.x).toBeGreaterThan(areaLeftBoundX);
        // Admin restricts lock permissions to users with only the "admin" tag.
        await Map.teleportToPosition(page, 0, 3 * 32);
        await Menu.openMapEditor(page);
        await MapEditor.openAreaEditor(page);
        await page.locator("canvas").click({
            position: {
                x: 260,
                y: 223,
            },
        });
        await expect(page.getByText("Tags allowed to lock/unlock")).toBeVisible();
        const lockableTagsInput = page.getByPlaceholder("Select rights").first();
        await lockableTagsInput.click();
        await lockableTagsInput.fill("admin");
        await lockableTagsInput.press("Enter");
        await Menu.closeMapEditor(page);
        await Map.teleportToPosition(page, 0, 0);

        // Alice is in the area but cannot lock/unlock anymore.
        await expect(page2.getByTestId("lock-button")).toHaveClass(/opacity-50/);

        // Admin goes back to the area and locks it.
        await Map.teleportToPosition(page, 4 * 32 * 1.5, 4 * 32 * 1.5);
        await expect(page.getByTestId("lock-button")).toBeVisible();
        await page.getByTestId("lock-button").click();
        await expect(page.getByTestId("lock-button")).toHaveClass(/bg-danger/);

        // Admin opens map editor, selects the area again, and moves the area down by 5 tiles. Nobody should be
        // left in the area after the move, so it should be automatically unlocked and Alice should be able to enter it again.
        await Menu.openMapEditor(page);
        await MapEditor.openAreaEditor(page);
        await page.locator("canvas").click({
            position: {
                x: 260,
                y: 223,
            },
        });
        await expect(page.getByText("Tags allowed to lock/unlock")).toBeVisible();

        await AreaEditor.moveArea(
            page,
            { x: 1 * 32 * 1.5, y: 2 * 32 * 1.5 },
            { x: 9 * 32 * 1.5, y: 7 * 32 * 1.5 },
            { x: 0, y: 5 * 32 * 1.5 },
        );
        await Menu.closeMapEditor(page);

        await Map.walkTo(page2, "ArrowDown", 2000);
        const alicePositionAfterAreaMove = await Map.getPosition(page2);
        expect(alicePositionAfterAreaMove.y).toBeGreaterThan(6 * 32 * 1.5);
        await expect(page2.getByText("This area is locked. You cannot enter.")).toBeHidden();

        await page2.context().close();
        await page.context().close();
    });
});
