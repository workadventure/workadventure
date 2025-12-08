import {test} from "@playwright/test";
import Map from "../utils/map";
import AreaEditor from "../utils/map-editor/areaEditor";
import {resetWamMaps} from "../utils/map-editor/uploader";
import MapEditor from "../utils/mapeditor";
import Menu from "../utils/menu";
import {map_storage_url} from "../utils/urls";
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

    test("highlight property", async ({ browser, request }) => {
        await resetWamMaps(request);
        await using page = await getPage(browser, 'Admin1', Map.url('empty'));
        // Open the map editor
        await Menu.openMapExplorer(page);
        await MapEditor.openAreaEditor(page);
        await AreaEditor.drawArea(page, { x: 0 * 32 * 1.5, y: 5 * 32 * 1.5 }, { x: 5 * 32 * 1.5, y: 9 * 32 * 1.5 });
        await AreaEditor.addProperty(page, "highlight");

        await page.getByRole('slider', { name: 'Opacity : 60 %' }).fill('0.3');
        await page.getByRole('slider', { name: 'Gradient Width : 10 px' }).fill('46');
        await page.getByRole('slider', { name: 'Transition duration (ms) :' }).fill('1214');
        await page.getByRole('textbox', { name: 'Color' }).click();
        await page.getByRole('textbox', { name: 'Color' }).fill('#ed0c0c');
    });
});
