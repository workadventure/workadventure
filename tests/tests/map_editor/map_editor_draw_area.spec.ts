import { expect, test } from "@playwright/test";
import Map from "../utils/map";
import { resetWamMaps } from "../utils/map-editor/uploader";
import MapEditor from "../utils/mapeditor";
import Menu from "../utils/menu";
import { map_storage_url } from "../utils/urls";
import { getPage } from "../utils/auth";
import { gameToBrowserCoordinates } from "../utils/gameCoordinates";
import { isMobile } from "../utils/isMobile";

test.setTimeout(240_000); // Fix Webkit that can take more than 60s
test.use({
    baseURL: map_storage_url,
});

test.describe("Map editor @oidc @nomobile @nowebkit", () => {
    test.beforeEach(({ browserName, page }) => {
        test.skip(browserName === "webkit" || isMobile(page), "Map editor unavailable on mobile; WebKit camera issues");
    });

    test("an area drawn up to the editor toolbar is still created", async ({ browser, request }) => {
        await resetWamMaps(request);
        await using page = await getPage(browser, "Admin1", Map.url("empty"));
        await Menu.openMapEditor(page);
        await MapEditor.openAreaEditor(page);

        // The toolbar lies over the canvas: releasing the button on it must end the drawing all the same.
        const start = await gameToBrowserCoordinates(page, { x: 1 * 32, y: 6 * 32 });
        await page.mouse.move(start.x, start.y);
        await page.mouse.down();
        await page.locator("section.side-bar-container .side-bar").hover();
        await page.mouse.up();

        // Property buttons only show for the selected area, which a new area is.
        await expect(page.getByTestId("highlight")).toBeVisible();
    });
});
