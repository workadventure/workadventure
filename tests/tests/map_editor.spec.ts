import * as fs from 'fs';
import * as path from 'path';
import { expect, test } from "@playwright/test";
import Map from "./utils/map";
import AreaEditor from "./utils/map-editor/areaEditor";
import ConfigureMyRoom from "./utils/map-editor/configureMyRoom";
import EntityEditor from "./utils/map-editor/entityEditor";
import Megaphone from "./utils/map-editor/megaphone";
import { resetWamMaps } from "./utils/map-editor/uploader";
import MapEditor from "./utils/mapeditor";
import Menu from "./utils/menu";
import { evaluateScript } from "./utils/scripting";
import { map_storage_url, publicTestMapUrl } from "./utils/urls";
import { getPage } from "./utils/auth";
import { isMobile } from "./utils/isMobile";

test.setTimeout(240_000); // Fix Webkit that can take more than 60s
test.use({
    baseURL: map_storage_url,
});

test.describe("Map editor @oidc", () => {
    test.beforeEach(
        "Ignore tests on mobile because map editor not available for mobile devices",
        ({ page }) => {
            //Map Editor not available on mobile
            if (isMobile(page)) {
                //eslint-disable-next-line playwright/no-skipped-test
                test.skip();
                return;
            }
        }
    );

    test.beforeEach("Ignore tests on webkit because of issue with camera and microphone", ({ browserName }) => {
        //WebKit has issue with camera
        if (browserName === "webkit") {
            //eslint-disable-next-line playwright/no-skipped-test
            test.skip();
            return;
        }
    });

    test("Successfully set the megaphone feature", async ({ browser, request }) => {
        await resetWamMaps(request);
        const page = await getPage(browser, "Admin1", Map.url("empty"));
        // Because webkit in playwright does not support Camera/Microphone Permission by settings
        await Map.teleportToPosition(page, 5 * 32, 5 * 32);

        // Second browser
        const page2 = await getPage(browser, 'Admin2', Map.url("empty"));

        // await Menu.openMenuAdmin(page);
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

        // Test if tags are working correctly, all current users doesn't have the tag "example" to use megaphone
        await Menu.isNotThereMegaphoneButton(page);
        await Menu.isNotThereMegaphoneButton(page2);

        // Remove rights
        await Menu.openMapEditor(page);
        await MapEditor.openConfigureMyRoom(page);
        await ConfigureMyRoom.selectMegaphoneItemInCMR(page);
        await Megaphone.megaphoneRemoveRights(page, "example");
        await Megaphone.megaphoneSave(page);
        await Megaphone.isCorrectlySaved(page);

        // Megaphone should be displayed and usable by all the current users
        await Menu.isThereMegaphoneButton(page);
        await Menu.isThereMegaphoneButton(page2);
        //await Menu.closeMapEditorConfigureMyRoomPopUp(page);
        //await Menu.closeMapEditor(page);
        await Menu.toggleMegaphoneButton(page);


        // Click on the button to start live message
        await page
            .locator(".menu-container #content-liveMessage")
        await expect(page.getByRole('button', { name: 'Start live message' })).toBeVisible();
        await page.getByRole('button', { name: 'Start live message' }).click({ timeout: 10_000 });

        await page
            .locator(".menu-container #active-liveMessage")
        await expect(page.getByRole('button', { name: 'Start megaphone' })).toBeVisible();
        await page.getByRole('button', { name: 'Start megaphone' }).click({ timeout: 10_000 });


        // click on the megaphone button to start the streaming session
        await expect(page2.getByText('Admin1', { exact: true })).toBeVisible({ timeout: 15_000 });

        await page.getByRole('button', { name: 'Stop megaphone' }).click();
        await expect(page.getByRole('heading', { name: 'Global communication' })).toBeHidden();

        await page2.close();
        await page2.context().close();
        await page.close();
        await page.context().close();
        // TODO IN THE FUTURE (PlayWright doesn't support it) : Add test if sound is correctly played
    });

    test('Successfully set "SpeakerZone" in the map editor', async ({ browser, request }) => {
        // skip the test, speaker zone with Jitsi is deprecated
        await resetWamMaps(request);
        const page = await getPage(browser, "Admin1", Map.url("empty"));
        //await page.evaluate(() => { localStorage.setItem('debug', '*'); });
        //await page.reload();

        await Menu.openMapEditor(page);
        await MapEditor.openAreaEditor(page);
        // await expect(page.locator('canvas')).toBeVisible();
        await AreaEditor.drawArea(page, { x: 1 * 32 * 1.5, y: 5 }, { x: 9 * 32 * 1.5, y: 4 * 32 * 1.5 });
        await AreaEditor.addProperty(page, "speakerMegaphone");
        await AreaEditor.setSpeakerMegaphoneProperty(page, `${browser.browserType().name()}SpeakerZone`);
        await AreaEditor.drawArea(page, { x: 1 * 32 * 1.5, y: 6 * 32 * 1.5 }, { x: 9 * 32 * 1.5, y: 9 * 32 * 1.5 });
        await AreaEditor.addProperty(page, "listenerMegaphone");
        await AreaEditor.setListenerZoneProperty(page, `${browser.browserType().name()}SpeakerZone`.toLowerCase());
        await Menu.closeMapEditor(page);
        await Map.teleportToPosition(page, 4 * 32, 2 * 32);

        await expect(page.locator('#cameras-container').getByText('You')).toBeVisible();

        // Second browser
        const page2 = await getPage(browser, "Admin2", Map.url("empty"));

        await Map.teleportToPosition(page2, 4 * 32, 7 * 32);

        // The user in the listener zone can see the speaker
        await expect(page2.locator('#cameras-container').getByText('Admin1')).toBeVisible({ timeout: 20_000 });
        // The speaker cannot see the listener
        await expect(page.locator('#cameras-container').getByText('Admin2')).toBeHidden({ timeout: 20_000 });

        // Now, let's move player 2 to the speaker zone
        await Map.walkToPosition(page2, 4 * 32, 2 * 32);
        // FIXME: if we use Map.teleportToPosition, the test fails. Why?
        //await Map.teleportToPosition(page2, 4*32, 2*32);

        // The first speaker (player 1) can now see player2
        await expect(page.locator('#cameras-container').getByText('Admin2')).toBeVisible({ timeout: 20_000 });
        // And the opposite is still true (player 2 can see player 1)
        await expect(page2.locator('#cameras-container').getByText('Admin1')).toBeVisible({ timeout: 20_000 });

        await page2.close();
        await page2.context().close();
        await page.close();
        await page.context().close();
    });

    test("Successfully set start area in the map editor", async ({ browser, request }) => {
        await resetWamMaps(request);
        const page = await getPage(browser, "Admin1", Map.url("empty"));

        await Menu.openMapEditor(page);
        await MapEditor.openAreaEditor(page);
        await AreaEditor.drawArea(page, { x: 13 * 32, y: 0 }, { x: 15 * 32, y: 2 * 32 });
        await AreaEditor.setAreaName(page, "MyStartZone");
        await AreaEditor.addProperty(page, "startAreaProperty");
        await Menu.closeMapEditor(page);
        await page.close();
        await page.context().close();
    });

    test("Successfully set and working exit area in the map editor", async ({ browser, request }) => {
        await resetWamMaps(request);
        const page = await getPage(browser, "Admin1", Map.url("empty"));

        await Menu.openMapEditor(page);
        await MapEditor.openAreaEditor(page);
        await AreaEditor.drawArea(page, { x: 8 * 32 * 1.5, y: 8 * 32 * 1.5 }, { x: 10 * 32 * 1.5, y: 10 * 32 * 1.5 });
        await AreaEditor.addProperty(page, "exitAreaProperty");
        await AreaEditor.setExitProperty(page, "maps/start_defined.wam", "MyStartZone");
        await Menu.closeMapEditor(page);

        try {
            await Map.teleportToPosition(page, 9 * 32, 9 * 32);
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
        } catch (_) {
            // evaluateScript will throw an error if the script frame unloaded because of page change
        }
        await expect.poll(() => page.url()).toContain("start_defined.wam#MyStartZone");

        await evaluateScript(page, async () => {
            await WA.onInit();
            const position = await WA.player.getPosition();
            if (position.x >= 290 && position.x <= 310 && position.y >= 15 && position.y <= 35) {
                return;
            }
            throw new Error(`Player is not at the correct position : ${position.x} ${position.y}`);
        });
        await page.close();
        await page.context().close();
    });

    // Test to set Klaxoon application in the area with the map editor
    test("Successfully set Klaxoon's application in the area in the map editor", async ({ browser, request }) => {
        await resetWamMaps(request);
        const page = await getPage(browser, "Admin1", Map.url("empty"));

        //await Menu.openMapEditor(page);
        await Menu.openMapEditor(page);
        await MapEditor.openAreaEditor(page);
        await AreaEditor.drawArea(page, { x: 8 * 32 * 1.5, y: 8 * 32 * 1.5 }, { x: 10 * 32 * 1.5, y: 10 * 32 * 1.5 });
        await AreaEditor.setAreaName(page, "My app zone");

        // add property Klaxoon
        await AreaEditor.addProperty(page, "openWebsiteKlaxoon");

        // insert klaxoon link
        await page.getByPlaceholder("https://app.klaxoon.com/").first().fill("https://app.klaxoon.com/join/KXEWMSE3NF2M");
        await page.locator(".map-editor").click();

        // check if the iframe activity picker is opened
        const popupPromise = page.waitForEvent("popup");
        await Map.teleportToPosition(page, 9 * 32, 9 * 32);
        await popupPromise;

        // TODO make same test with object editor
        await page.close();
        await page.context().close();
    });

    test("Successfully set GoogleWorkspace's applications in the area in the map editor", async ({ browser, request }) => {
        await resetWamMaps(request);
        const page = await getPage(browser, "Admin1", Map.url("empty"));

        //await Menu.openMapEditor(page);
        await Menu.openMapEditor(page);
        await MapEditor.openAreaEditor(page);
        await AreaEditor.drawArea(page, { x: 8 * 32 * 1.5, y: 8 * 32 * 1.5 }, { x: 10 * 32 * 1.5, y: 10 * 32 * 1.5 });

        await AreaEditor.setAreaName(page, "My app zone");

        // add property Google Docs
        await AreaEditor.addProperty(page, "openWebsiteGoogleDocs");
        // add property Google Sheets
        await AreaEditor.addProperty(page, "openWebsiteGoogleSheets");
        // add property Google Slides
        await AreaEditor.addProperty(page, "openWebsiteGoogleSlides");
        // add property Google Slides
        await AreaEditor.addProperty(page, "openWebsiteGoogleDrive");

        // fill Google Docs link
        const googleDockButtonLocator = page.getByPlaceholder("https://docs.google.com/document/d/1iFHmKL4HJ6WzvQI-6FlyeuCy1gzX8bWQ83dNlcTzigk/edit").first();
        // While the link is not filled, loop to fill it
        await googleDockButtonLocator.fill("https://docs.google.com/document/d/1iFHmKL4HJ6WzvQI-6FlyeuCy1gzX8bWQ83dNlcTzigk/edit");
        await googleDockButtonLocator.first().blur({ timeout: 10_000 });
        await expect(googleDockButtonLocator).toHaveValue("https://docs.google.com/document/d/1iFHmKL4HJ6WzvQI-6FlyeuCy1gzX8bWQ83dNlcTzigk/edit?embedded=true", { timeout: 10_000 });

        // fill Google Sheets link
        const googleSheetsButtonLocator = page.getByPlaceholder("https://docs.google.com/spreadsheets/d/1SBIn3IBG30eeq944OhT4VI_tSg-b1CbB0TV0ejK70RA/edit").first();
        await googleSheetsButtonLocator.fill("https://docs.google.com/spreadsheets/d/1SBIn3IBG30eeq944OhT4VI_tSg-b1CbB0TV0ejK70RA/edit");
        await googleSheetsButtonLocator.first().blur({ timeout: 10_000 });
        await expect(googleSheetsButtonLocator).toHaveValue("https://docs.google.com/spreadsheets/d/1SBIn3IBG30eeq944OhT4VI_tSg-b1CbB0TV0ejK70RA/edit?embedded=true", { timeout: 10_000 });

        // fill Google Slides link
        const googleSlidesButtonLocator = page.getByPlaceholder("https://docs.google.com/presentation/d/1fU4fOnRiDIvOoVXbksrF2Eb0L8BYavs7YSsBmR_We3g/edit").first();
        // While the link is not filled, loop to fill it
        await googleSlidesButtonLocator.fill("https://docs.google.com/presentation/d/1fU4fOnRiDIvOoVXbksrF2Eb0L8BYavs7YSsBmR_We3g/edit");
        await googleSlidesButtonLocator.first().blur({ timeout: 10_000 });
        await expect(googleSlidesButtonLocator).toHaveValue("https://docs.google.com/presentation/d/1fU4fOnRiDIvOoVXbksrF2Eb0L8BYavs7YSsBmR_We3g/edit?embedded=true", { timeout: 10_000 });

        // fill Google Slides link
        const googleDriveButtonLocator = page.getByPlaceholder("https://drive.google.com/file/d/1DjNjZVbVeQO9EvgONLzCtl6wG-kxSr9Z/preview").first();
        await googleDriveButtonLocator.fill("https://drive.google.com/file/d/1DjNjZVbVeQO9EvgONLzCtl6wG-kxSr9Z/preview");
        await googleDriveButtonLocator.first().blur({ timeout: 10_000 });
        await expect(googleDriveButtonLocator).toHaveValue("https://drive.google.com/file/d/1DjNjZVbVeQO9EvgONLzCtl6wG-kxSr9Z/preview", { timeout: 10_000 });

        // close object selector
        await Menu.closeMapEditor(page);

        // teleport on the area position and open the popup
        await Map.teleportToPosition(page, 9 * 32, 9 * 32);

        // check if the iframe was opened and button thumbnail is visible
        await page.getByTestId('tab1').getByText('Docs', { exact: true }).click();
        await page.getByTestId('tab2').getByText('Docs', { exact: true }).click();
        await page.locator('.flex-0 > .w-10').click();
        await page.getByTestId('tab2').getByText('Docs', { exact: true }).click();
        await page.getByTestId('tab3').getByText('Docs', { exact: true }).click();
        await page.locator('div:nth-child(3) > .w-10').click();
        await page.getByText('Drive', { exact: true }).click();
        await page.locator('div:nth-child(3) > .w-10').click();
        await page.getByText('Drive', { exact: true }).click();

        await page.close();
        await page.context().close();
    });

    test("Successfully set GoogleWorkspace's application entity in the map editor", async ({ browser, request }) => {
        await resetWamMaps(request);
        const page = await getPage(browser, "Admin1", Map.url("empty"));

        // open map editor
        await Menu.openMapEditor(page);
        await MapEditor.openEntityEditor(page);

        // select entity and push it into the map
        await EntityEditor.selectEntity(page, 0, "small table");
        await EntityEditor.moveAndClick(page, 1, (8.5 * 32 * 1.5) - 15);

        // quit object selector
        await EntityEditor.clearEntitySelection(page);
        await EntityEditor.moveAndClick(page, 1, (8.5 * 32 * 1.5) - 15);

        // add property Google Docs
        await EntityEditor.addProperty(page, "openWebsiteGoogleDocs");
        // fill Google Docs link
        await page
            .getByPlaceholder("https://docs.google.com/document/d/1iFHmKL4HJ6WzvQI-6FlyeuCy1gzX8bWQ83dNlcTzigk/edit")
            .first()
            .fill("https://docs.google.com/document/d/1iFHmKL4HJ6WzvQI-6FlyeuCy1gzX8bWQ83dNlcTzigk/edit");

        // add property Google Sheets
        await EntityEditor.addProperty(page, "openWebsiteGoogleSheets");
        // fill Google Sheets link
        await page
            .getByPlaceholder("https://docs.google.com/spreadsheets/d/1SBIn3IBG30eeq944OhT4VI_tSg-b1CbB0TV0ejK70RA/edit")
            .first()
            .fill("https://docs.google.com/spreadsheets/d/1SBIn3IBG30eeq944OhT4VI_tSg-b1CbB0TV0ejK70RA/edit");

        // add property Google Slides
        await EntityEditor.addProperty(page, "openWebsiteGoogleSlides");
        // fill Google Slides link
        await page
            .getByPlaceholder("https://docs.google.com/presentation/d/1fU4fOnRiDIvOoVXbksrF2Eb0L8BYavs7YSsBmR_We3g/edit")
            .first()
            .fill("https://docs.google.com/presentation/d/1fU4fOnRiDIvOoVXbksrF2Eb0L8BYavs7YSsBmR_We3g/edit");

        // add property Google Drive
        await EntityEditor.addProperty(page, "openWebsiteGoogleDrive");
        // fill Google Drive link
        await page
            .getByPlaceholder("https://drive.google.com/file/d/1DjNjZVbVeQO9EvgONLzCtl6wG-kxSr9Z/preview")
            .first()
            .fill("https://drive.google.com/file/d/1DjNjZVbVeQO9EvgONLzCtl6wG-kxSr9Z/preview");

        // close object selector
        await Menu.closeMapEditor(page);

        // click on the object and open popup
        await EntityEditor.moveAndClick(page, 1, (8.5 * 32 * 1.5) - 15);

        // check if the popup with application is opened and can be close
        await expect(page.getByRole('button', { name: 'Open Google Drive' })).toBeVisible();
        await expect(page.getByRole('button', { name: 'Open Google Slides' })).toBeVisible();
        await expect(page.getByRole('button', { name: 'Open Google Sheets' })).toBeVisible();
        await expect(page.getByRole('button', { name: 'Open Google Docs' })).toBeVisible();
        await page.getByTestId('actions-menu').getByRole('button', { name: 'Close' }).click();

        await page.close();
        await page.context().close();
    });

    test("Successfully set Klaxoon's application entity in the map editor @local", async ({ browser, request }) => {
        await resetWamMaps(request);
        const page = await getPage(browser, "Admin1", Map.url("empty"));

        // open map editor
        await Menu.openMapEditor(page);
        await MapEditor.openEntityEditor(page);

        // select entity and push it into the map
        await EntityEditor.selectEntity(page, 0, "small table");
        await EntityEditor.moveAndClick(page, 1, (8.5 * 32 * 1.5) - 15);

        // quit object selector
        await EntityEditor.clearEntitySelection(page);
        await EntityEditor.moveAndClick(page, 1, (8.5 * 32 * 1.5) - 15);

        // add property Klaxoon
        await EntityEditor.addProperty(page, "openWebsiteKlaxoon");

        // fill Klaxoon link
        await page.getByPlaceholder("https://app.klaxoon.com/").first().fill("https://app.klaxoon.com/join/KXEWMSE3NF2M");

        // close object selector
        await Menu.closeMapEditor(page);

        // click on the object and open popup
        await EntityEditor.moveAndClick(page, 1, (8.5 * 32 * 1.5) - 15);

        // check if the popup with application is opened and can be closed
        await expect(page.getByRole('button', { name: 'Open Klaxoon' })).toBeVisible();
        await page.getByRole('button', { name: 'Close', exact: true }).click();

        await page.close();
        await page.context().close();
    });

    // Create test for Google picker docs
    // test('Successfully open Google picker for docs', async ({ page, browser, request, browserName }) => {});
    // Create test for Google picker spreadsheet
    // Create test for Google picker presentation
    // Create test for Google picker drive

    test("Successfully upload a custom entity", async ({ browser, request }) => {
        await resetWamMaps(request);
        const page = await getPage(browser, "Admin1", Map.url("empty"));

        // open map editor
        await Menu.openMapEditor(page);
        await MapEditor.openEntityEditor(page);

        // Click on upload asset
        await EntityEditor.uploadTestAsset(page);

        // Search uploaded asset
        const uploadedEntityLocator = await EntityEditor.searchEntity(page, EntityEditor.getTestAssetName());
        const uploadedEntityElement = await uploadedEntityLocator.innerHTML();
        expect(uploadedEntityElement).toContain(EntityEditor.getTestAssetName());

        await page.close();
        await page.context().close();
    });

    test("Successfully upload and use custom entity in the map", async ({ browser, request }) => {
        await resetWamMaps(request);

        // First browser + moved woka
        const page = await getPage(browser, "Admin1", Map.url("empty"));
        await Map.teleportToPosition(page, 0, 0);

        // Second browser
        const page2 = await getPage(browser, "Admin2", Map.url("empty"));

        // open map editor
        await page.bringToFront();
        await Menu.openMapEditor(page);
        await MapEditor.openEntityEditor(page);

        // Click on upload asset
        await EntityEditor.uploadTestAsset(page);

        // Select uploaded entity and move it to the map
        await EntityEditor.selectEntity(page, 0, EntityEditor.getTestAssetName());
        await EntityEditor.moveAndClick(page, 2 * 32 * 1.5, 8.5 * 32 * 1.5);

        // Add open link interaction on uploaded asset
        await EntityEditor.clearEntitySelection(page);
        await EntityEditor.moveAndClick(page, 2 * 32 * 1.5, 8.5 * 32 * 1.5 - 16);
        await EntityEditor.addProperty(page, "openWebsite");

        // fill link
        await page.getByPlaceholder("https://workadventu.re").first().fill("https://workadventu.re");

        // close object selector
        await Menu.closeMapEditor(page);

        // click on the object and open popup on both pages
        await EntityEditor.moveAndClick(page, 2 * 32 * 1.5, 8.5 * 32 * 1.5 - 16);
        await EntityEditor.moveAndClick(page2, 2 * 32 * 1.5, 8.5 * 32 * 1.5 - 16);

        // check if the popup with application is opened on both pages
        await expect(page.getByRole('button', { name: 'Open Link' })).toBeVisible();
        await expect(page2.getByRole('button', { name: 'Open Link' })).toBeVisible();

        await page2.close();
        await page2.context().close();
        await page.close();
        await page.context().close();
    });


    test("Successfully upload and use custom entity with odd size in the map", async ({ browser, request }) => {
        await resetWamMaps(request);

        // First browser + moved woka
        const page = await getPage(browser, "Admin1", Map.url("empty"));
        await Map.teleportToPosition(page, 0, 0);

        // Second browser
        const newBrowser = await browser.newContext();
        const page2 = await getPage(browser, "Admin1", Map.url("empty"));

        // open map editor
        await page.bringToFront();
        await Menu.openMapEditor(page);
        await MapEditor.openEntityEditor(page);

        // Click on upload asset
        await EntityEditor.uploadTestAssetWithOddSize(page);

        // Select uploaded entity and move it to the map
        await EntityEditor.selectEntity(page, 0, EntityEditor.getTestAssetName() + "OddSize");
        await EntityEditor.moveAndClick(page, 6 * 32, 10 * 32);

        // Add open link interaction on uploaded asset
        await EntityEditor.clearEntitySelection(page);
        await EntityEditor.moveAndClick(page, 6 * 32, 10 * 32);
        await EntityEditor.addProperty(page, "openWebsite");

        // fill link
        await page.getByPlaceholder("https://workadventu.re").first().fill("https://workadventu.re");

        // close object selector
        await Menu.closeMapEditor(page);
        
        await page.getByTestId("camera-container").waitFor({ state: 'detached' });
        

        // click on the object and open popup on both pages
        await EntityEditor.moveAndClick(page, 6 * 32, 10 * 32);

        await page2.getByTestId("camera-container").waitFor({ state: 'detached' });
        await EntityEditor.moveAndClick(page2, 6 * 32, 10 * 32);

        
        // check if the popup with application is opened on both pages
        await expect(page.getByRole('button', { name: 'Open Link' })).toBeVisible();
        await expect(page2.getByRole('button', { name: 'Open Link' })).toBeVisible();

        await page2.close();
        await newBrowser.close();
        await page.close();
        await page.context().close();
    });

    test("Successfully upload and edit asset name", async ({ browser, request }) => {
        // Init wam file
        await resetWamMaps(request);

        // First browser + moved woka
        const page = await getPage(browser, "Admin1", Map.url("empty"));
        await Map.teleportToPosition(page, 0, 0);

        // Second browser
        const page2 = await getPage(browser, "Admin2", Map.url("empty"));

        // open map editor on both pages
        await Menu.openMapEditor(page);
        await Menu.openMapEditor(page2);
        await MapEditor.openEntityEditor(page);
        await MapEditor.openEntityEditor(page2);

        // Click on upload asset on page 1
        await EntityEditor.uploadTestAsset(page);

        // Select uploaded entity and rename it on page 1
        await EntityEditor.selectEntity(page, 0, EntityEditor.getTestAssetName());
        await EntityEditor.openEditEntityForm(page);
        const newEntityName = "My Entity";
        await page.getByTestId("name").fill(newEntityName);
        await EntityEditor.applyEntityModifications(page);
        // Clear entity selection
        await page.getByTestId("clearEntitySelection").click();

        // Search uploaded entity on both pages
        const uploadedEntityLocator = await EntityEditor.searchEntity(page, newEntityName);
        const uploadedEntityLocator2 = await EntityEditor.searchEntity(page2, newEntityName);

        // Get inner html on both pages
        const uploadedEntityElement = await uploadedEntityLocator.innerHTML();
        const uploadedEntityElement2 = await uploadedEntityLocator2.innerHTML();

        // Expect inner html in string to contain the new entity name
        expect(uploadedEntityElement).toContain(newEntityName);
        expect(uploadedEntityElement2).toContain(newEntityName);

        await page2.close();
        await page2.context().close();
        await page.close();
        await page.context().close();
    });

    test("Successfully upload and remove custom entity", async ({ browser, request }) => {
        await resetWamMaps(request);

        // First browser + moved woka
        const page = await getPage(browser, "Admin1", Map.url("empty"));

        await Map.teleportToPosition(page, 0, 0);

        // Second browser
        const page2 = await getPage(browser, "Admin2", Map.url("empty"));

        // open map editor on both pages
        await Menu.openMapEditor(page);
        await Menu.openMapEditor(page2);

        await MapEditor.openEntityEditor(page);
        await MapEditor.openEntityEditor(page2);

        // Click on upload asset on page 1
        await EntityEditor.uploadTestAsset(page);

        // Select uploaded entity on both pages
        await EntityEditor.selectEntity(page, 0, EntityEditor.getTestAssetName());
        await EntityEditor.selectEntity(page2, 0, EntityEditor.getTestAssetName());

        // Click on edit button and remove entity on page1
        await EntityEditor.openEditEntityForm(page);
        await EntityEditor.removeEntity(page);

        // Expect both pages to have no entities
        await expect(page.getByTestId("entity-item")).toHaveCount(0);
        await expect(page2.getByTestId("entity-item")).toHaveCount(0);

        await page2.close();
        await page2.context().close();
        await page.close();
        await page.context().close();
    });

    test("Successfully set searchable feature for entity and zone", async ({ browser, request }) => {
        await resetWamMaps(request);
        const page = await getPage(browser, "Admin1", Map.url("empty"));

        // Open the map editor
        await Menu.openMapEditor(page);

        // Area
        await MapEditor.openAreaEditor(page);
        await AreaEditor.drawArea(page, { x: 1 * 32 * 1.5, y: 5 }, { x: 9 * 32 * 1.5, y: 4 * 32 * 1.5 });
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
        await EntityEditor.setEntityName(page, "My Jitsi Entity");
        await EntityEditor.setEntityDescription(
            page,
            "This is a Jitsi entity to test the search feature in the exploration mode. It should be searchable."
        );
        await EntityEditor.setEntitySearcheable(page, true);
        await EntityEditor.addProperty(page, "jitsiRoomProperty");

        // Open the map exploration mode
        await MapEditor.openExploration(page);

        // Expected 1 entity and 1 zone in the search result
        // Test if the entity is searchable
        await expect(page.locator(".map-editor .sidebar .entities")).toContainText("1 objects found");
        await page.locator(".map-editor .sidebar .entities").click();
        expect(await page.locator(".map-editor .sidebar .entity-items .item").count()).toBe(1);

        // Click on the entity and check that Title and description are correct
        await page.locator(".map-editor .sidebar .entity-items .item").first().click();
        await expect(page.locator(".object-menu h1")).toContainText("MY JITSI ENTITY");
        await expect(page.locator(".object-menu p"))
            .toContainText("This is a Jitsi entity to test the search feature in the exploration mode. It should be searchable.");

        // Test if the area is searchable
        await expect(page.locator(".map-editor .sidebar .areas")).toContainText("1 areas found");
        await page.locator(".map-editor .sidebar .areas").click();
        expect(await page.locator(".map-editor .sidebar .area-items .item").count()).toBe(1);

        await page.close();
        await page.context().close();
    });

    test("Successfully test global message text and sound feature", async ({ browser, request }) => {
        await resetWamMaps(request);
        const page = await getPage(browser, "Admin1", Map.url("empty"));

        // Move user and not create discussion with the second user
        await Map.teleportToPosition(page, 5 * 32, 5 * 32);

        // Second browser
        const page2 = await getPage(browser, "Bob", Map.url("empty"));

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
        // Test if tags are working correctly, all current users doesn't have the tag "example" to use megaphone
        await Menu.isNotThereMegaphoneButton(page);
        await expect(page2.getByTestId('map-menu')).toBeHidden();
        //await Menu.isNotThereMegaphoneButton(page2);
        // Remove rights
        await Menu.openMapEditor(page);
        await MapEditor.openConfigureMyRoom(page);
        await ConfigureMyRoom.selectMegaphoneItemInCMR(page);
        await Megaphone.megaphoneRemoveRights(page, "example");
        await Megaphone.megaphoneSave(page);
        await Megaphone.isCorrectlySaved(page);
        // Megaphone should be displayed and usable by all the current users
        await Menu.isThereMegaphoneButton(page);

        // Megaphone button is not displayed because it is hidden in the "Admin" menu. BUT! It is available to anyone!
        await Menu.isThereMegaphoneButton(page2);

        // TODO : create this test in admin part (global message and text audio message if an admin feature)
        // TODO : change to use the global message feature for user through megaphon settings rights

        await page2.close();
        await page2.context().close();
        await page.close();
        await page.context().close();
        // TODO IN THE FUTURE (PlayWright doesn't support it) : Add test if sound is correctly played
    });

    test("assert map editor not visible on public maps @oidc", async ({ browser }) => {
        const page = await getPage(browser, 'Admin1',
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

    test('drop PDF file onto canvas inside #game', async ({ browser, request }) => {
        await resetWamMaps(request);
        const page = await getPage(browser, 'Admin1', Map.url('empty'));

        // Prepare file
        const filePath = path.join(__dirname, './assets/lorem-ipsum.pdf');
        const buffer = fs.readFileSync(filePath);
        const base64 = buffer.toString('base64');

        // Drop file via drag-and-drop simulation
        await page.evaluate(
            async ({ selector, fileName, mimeType, base64Data }) => {
                function base64ToUint8Array(base64: string): Uint8Array {
                    const binary = atob(base64);
                    const len = binary.length;
                    const bytes = new Uint8Array(len);
                    for (let i = 0; i < len; i++) {
                        bytes[i] = binary.charCodeAt(i);
                    }
                    return bytes;
                }

                const target = document.querySelector(selector);
                if (!target) throw new Error(`Selector "${selector}" not found`);

                const fileBytes = base64ToUint8Array(base64Data);
                const blob = new Blob([fileBytes], { type: mimeType });
                const file = new File([blob], fileName, { type: mimeType });

                const dataTransfer = new DataTransfer();
                dataTransfer.items.add(file);

                const eventInit: DragEventInit = {
                    bubbles: true,
                    cancelable: true,
                    dataTransfer,
                };

                for (const eventType of ['dragenter', 'dragover', 'drop']) {
                    const event = new DragEvent(eventType, eventInit);
                    target.dispatchEvent(event);
                }
            },
            {
                selector: '#game canvas',
                fileName: 'lorem-ipsum.pdf',
                mimeType: 'application/pdf',
                base64Data: base64
            }
        );

        await expect(page.getByText('Choose an object')).toBeVisible();
        await page.getByText('Save').click();

        EntityEditor.moveAndClick(page, 32, 300);

        await expect(page.getByText('Books (Variant 5)')).toBeVisible();
        await expect(page.getByText('lorem-ipsum.pdf')).toBeVisible();
    });
    
    test("Assert map explorer visible for guest", async ({ browser, request }) => {
        const page = await getPage(browser, 'Alice', Map.url("empty"));

        // Open the map editor
        await Menu.openMapExplorer(page);
    });
});
