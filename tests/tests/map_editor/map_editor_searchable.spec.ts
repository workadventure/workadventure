import {expect, test} from "@playwright/test";
import Map from "../utils/map";
import AreaEditor from "../utils/map-editor/areaEditor";
import EntityEditor from "../utils/map-editor/entityEditor";
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

    test("Successfully set searchable feature for entity and zone", async ({ browser, request }) => {
        await resetWamMaps(request);
        await using page = await getPage(browser, "Admin1", Map.url("empty"));

        // Open the map editor
        await Menu.openMapEditor(page);

        // Area
        await MapEditor.openAreaEditor(page);
        await AreaEditor.drawArea(page, { x: 1 * 32 * 1.5, y: 2 * 32 * 1.5 }, { x: 9 * 32 * 1.5, y: 4 * 32 * 1.5 });
        await AreaEditor.setAreaName(page, "My Focusable Zone");
        await AreaEditor.setAreaDescription(
            page,
            "This is a focus zone to test the search feature in the exploration mode. It should be searchable."
        );
        await AreaEditor.setAreaSearcheable(page, true);
        await AreaEditor.addProperty(page, "focusable");

        // Entity
        await MapEditor.openEntityEditor(page);
        await EntityEditor.selectEntity(page, 0, "small table");
        await EntityEditor.moveAndClick(page, 1, (8.5 * 32 * 1.5) - 15);
        await EntityEditor.clearEntitySelection(page);
        await EntityEditor.moveAndClick(page, 1, (8.5 * 32 * 1.5) - 15);
        await EntityEditor.setEntityName(page, "My Play Audio Entity");
        await EntityEditor.setEntityDescription(
            page,
            "This is a Play Audio entity to test the search feature in the exploration mode. It should be searchable."
        );
        await EntityEditor.setEntitySearcheable(page, true);
        await EntityEditor.addProperty(page, "playAudio");

        // Open the map exploration mode
        await MapEditor.openExploration(page);

        // Expected 1 entity and 1 zone in the search result
        // Test if the entity is searchable
        await expect(page.locator(".map-editor .sidebar .entities")).toContainText("1 objects found");
        await page.getByTestId("toggleFolderEntity").click();
        expect(await page.locator(".map-editor .sidebar .entity-items .item").count()).toBe(1);

        // Click on the entity and check that Title and description are correct
        await page.locator(".map-editor .sidebar .entity-items .item").first().click();
        await expect(page.locator(".object-menu h1")).toContainText("My Play Audio Entity".toUpperCase());
        await expect(page.locator(".object-menu p"))
            .toContainText("This is a Play Audio entity to test the search feature in the exploration mode. It should be searchable.");

        // Test if the area is searchable
        await expect(page.locator(".map-editor .sidebar .areas")).toContainText("1 areas found");
        await page.getByTestId("toggleFolderArea").click();
        expect(await page.locator(".map-editor .sidebar .area-items .item").count()).toBe(1);

        await page.close();
        await page.context().close();
    });
});
