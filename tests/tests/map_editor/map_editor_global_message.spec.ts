import {expect, test} from "@playwright/test";
import Map from "../utils/map";
import ConfigureMyRoom from "../utils/map-editor/configureMyRoom";
import Megaphone from "../utils/map-editor/megaphone";
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

    test("Successfully test global message text and sound feature", async ({ browser, request }) => {
        await resetWamMaps(request);
        await using page = await getPage(browser, "Admin1", Map.url("empty"));

        // Move user and not create discussion with the second user
        await Map.teleportToPosition(page, 5 * 32, 5 * 32);

        // Second browser
        await using page2 = await getPage(browser, "Bob", Map.url("empty"));

        // Open the map editor and configure the megaphone to have access to the global message
        await Menu.openMapEditor(page);
        await MapEditor.openConfigureMyRoom(page);
        await ConfigureMyRoom.selectMegaphoneItemInCMR(page);

        // Enabling megaphone and settings default value
        await Megaphone.toggleMegaphone(page);
        await Megaphone.isMegaphoneEnabled(page);

        // Testing if no input is set, megaphone should not be usable but WA should not crash
        await Megaphone.megaphoneInputNameSpace(page, "");
        await Megaphone.megaphoneSave(page);
        await Megaphone.isNotCorrectlySaved(page);

        await Megaphone.megaphoneInputNameSpace(page, `${browser.browserType().name()}MySpace`);
        await Megaphone.megaphoneSelectScope(page);
        await Megaphone.megaphoneAddNewRights(page, "example");
        await Megaphone.megaphoneSave(page);
        await Megaphone.isCorrectlySaved(page);
        // Close the configuration popup
        await Menu.closeMapEditorConfigureMyRoomPopUp(page);

        // Test if tags are working correctly, all current users doesn't have the tag "example" to use megaphone
        await Menu.isNotThereMegaphoneButton(page);
        await expect(page2.getByTestId('map-menu')).toBeHidden();
        
        // Remove rights
        await Menu.openMapEditor(page);
        await MapEditor.openConfigureMyRoom(page);
        await ConfigureMyRoom.selectMegaphoneItemInCMR(page);
        await Megaphone.megaphoneRemoveRights(page, "example");
        await Megaphone.megaphoneSave(page);
        await Megaphone.isCorrectlySaved(page);
        // Close the configuration popup
        await Menu.closeMapEditorConfigureMyRoomPopUp(page);
        
        // Megaphone should be displayed and usable by all the current users
        await Menu.isThereMegaphoneButton(page);

        // Megaphone button is not displayed because it is hidden in the "Admin" menu. BUT! It is available to anyone!
        await Menu.isThereMegaphoneButton(page2);

        // TODO : create this test in admin part (global message and text audio message if an admin feature)
        // TODO : change to use the global message feature for user through megaphon settings rights


        await page2.context().close();
        await page.close();
        await page.context().close();
        // TODO IN THE FUTURE (PlayWright doesn't support it) : Add test if sound is correctly played
    });

});
