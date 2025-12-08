import {expect, test} from "@playwright/test";
import Map from "../utils/map";
import Menu from "../utils/menu";
import {map_storage_url, publicTestMapUrl} from "../utils/urls";
import {getPage} from "../utils/auth";
import {isMobile} from "../utils/isMobile";

test.setTimeout(240_000); // Fix Webkit that can take more than 60s
test.use({
    baseURL: map_storage_url,
});

test.describe("Map editor @oidc @nomobile @nowebkit", () => {
    test.beforeEach(
        "Ignore tests on mobile because map editor not available for mobile devices",
        ({ page }) => {
            // Map Editor not available on mobile
            test.skip(isMobile(page), 'Map editor is not available on mobile');
        }
    );

    test.beforeEach("Ignore tests on webkit because of issue with camera and microphone", ({ browserName }) => {
        // WebKit has issue with camera
        test.skip(browserName === 'webkit', 'WebKit has issues with camera/microphone');
    });

    test("assert map editor not visible on public maps @oidc", async ({ browser }) => {
        await using page = await getPage(browser, 'Admin1',
            publicTestMapUrl("tests/E2E/empty.json", "iframe_script")
        );

        await Menu.openMapMenu(page);

        // Check if the map editor is disabled
        await expect(
            page.getByText("Map editor")
        ).toBeHidden();

        await page.close();
        await page.context().close();
    });

    test("Assert map explorer visible for guest", async ({ browser, request }) => {
        await using page = await getPage(browser, 'Alice', Map.url("empty"));

        // Open the map editor
        await Menu.openMapExplorer(page);
    });
});
