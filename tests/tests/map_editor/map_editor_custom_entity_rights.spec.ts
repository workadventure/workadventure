import { expect, test } from "@playwright/test";
import Map from "../utils/map";
import AreaAccessRights from "../utils/areaAccessRights";
import EntityEditor from "../utils/map-editor/entityEditor";
import { resetWamMaps } from "../utils/map-editor/uploader";
import MapEditor from "../utils/mapeditor";
import Menu from "../utils/menu";
import { oidcLogout } from "../utils/oidc";
import { map_storage_url } from "../utils/urls";
import { getPage } from "../utils/auth";
import { isMobile } from "../utils/isMobile";

test.setTimeout(240_000); // Fix Webkit that can take more than 60s
test.use({
    baseURL: map_storage_url,
});

/**
 * A user without map edit rights can still reach the map editor through a zone write right (or a
 * personal area) and upload custom entities. These tests pin down that they cannot edit or delete
 * the custom entities uploaded by somebody else, but can still manage their own.
 */
test.describe("Map editor custom entity rights @oidc @nomobile @nowebkit", () => {
    test.beforeEach("Ignore tests on mobile because map editor not available for mobile devices", ({ page }) => {
        // Map Editor not available on mobile
        test.skip(isMobile(page), "Map editor is not available on mobile");
    });

    test.beforeEach("Ignore tests on webkit because of issue with camera and microphone", ({ browserName }) => {
        // WebKit has issue with camera
        test.skip(browserName === "webkit", "WebKit has issues with camera/microphone");
    });

    test("A member cannot edit or delete a custom entity uploaded by an admin", async ({ browser, request }) => {
        await resetWamMaps(request);
        await using page = await getPage(browser, "Admin1", Map.url("empty"));

        // Give members write access on an area, so that they get the map editor without edit rights
        await Menu.openMapEditor(page);
        await AreaAccessRights.openAreaEditorAndAddAreaWithRights(page, ["member"], []);

        // Upload a custom entity as the admin
        await MapEditor.openEntityEditor(page);
        await EntityEditor.uploadTestAsset(page);
        await Menu.closeMapEditor(page);
        await oidcLogout(page);
        await page.close();

        // The member sees the asset but gets no edit button on it
        await using page2 = await getPage(browser, "Member1", Map.url("empty"));
        await page2.getByTestId("cameras-container").waitFor({ state: "detached" });
        await Menu.openMapEditor(page2);
        await EntityEditor.selectEntity(page2, 0, EntityEditor.getTestAssetName());
        await expect(page2.getByTestId("editEntity")).toHaveCount(0);
    });

    test("A member can delete the custom entity they uploaded themselves", async ({ browser, request }) => {
        await resetWamMaps(request);
        await using page = await getPage(browser, "Admin1", Map.url("empty"));

        // Give members write access on an area, so that they get the map editor without edit rights
        await Menu.openMapEditor(page);
        await AreaAccessRights.openAreaEditorAndAddAreaWithRights(page, ["member"], []);
        await Menu.closeMapEditor(page);
        await oidcLogout(page);
        await page.close();

        await using page2 = await getPage(browser, "Member1", Map.url("empty"));
        await page2.getByTestId("cameras-container").waitFor({ state: "detached" });
        await Menu.openMapEditor(page2);
        await MapEditor.openEntityEditor(page2);
        await EntityEditor.uploadTestAsset(page2);

        // Reload so that the collection is re-fetched from map-storage: this proves the owner
        // survives the round trip through entities.json and not only the optimistic local insert.
        await page2.reload();
        await Menu.waitForMapLoad(page2);
        await Menu.openMapEditor(page2);
        await EntityEditor.selectEntity(page2, 0, EntityEditor.getTestAssetName());

        await expect(page2.getByTestId("editEntity")).toBeVisible();
        await EntityEditor.openEditEntityForm(page2);
        await EntityEditor.removeEntity(page2);

        await expect(page2.getByTestId("entity-item")).toHaveCount(0);
    });
});
