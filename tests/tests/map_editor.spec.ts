import {expect, test, webkit} from "@playwright/test";
import Map from "./utils/map";
import AreaEditor from "./utils/map-editor/areaEditor";
import ConfigureMyRoom from "./utils/map-editor/configureMyRoom";
import EntityEditor from "./utils/map-editor/entityEditor";
import Megaphone from "./utils/map-editor/megaphone";
import {resetWamMaps} from "./utils/map-editor/uploader";
import MapEditor from "./utils/mapeditor";
import Menu from "./utils/menu";
import {hideNoCamera, login} from "./utils/roles";
import {evaluateScript} from "./utils/scripting";
import {map_storage_url} from "./utils/urls";
import {oidcAdminTagLogin} from "./utils/oidc";

test.setTimeout(240_000); // Fix Webkit that can take more than 60s
test.use({
    baseURL: map_storage_url,
});

test.describe("Map editor @oidc", () => {
    test.beforeEach(
        "Ignore tests on mobilechromium because map editor not available for mobile devices",
        ({}, {project}) => {
            //Map Editor not available on mobile
            if (project.name === "mobilechromium") {
                //eslint-disable-next-line playwright/no-skipped-test
                test.skip();
                return;
            }
        }
    );

    test.beforeEach("Ignore tests on webkit because of issue with camera and microphone", ({browserName}) => {
        //WebKit has issue with camera
        if (browserName === "webkit") {
            //eslint-disable-next-line playwright/no-skipped-test
            test.skip();
            return;
        }
    });

    test("Successfully set the megaphone feature", async ({page, browser, request, browserName}) => {
        await resetWamMaps(request);
        await page.goto(Map.url("empty"));
        //await page.evaluate(() => localStorage.setItem('debug', '*'));
        await login(page, "test", 3);
        await oidcAdminTagLogin(page);
        // Because webkit in playwright does not support Camera/Microphone Permission by settings
        if (browserName === "webkit") {
            await hideNoCamera(page);
        }
        await Map.teleportToPosition(page, 5 * 32, 5 * 32);

        // Second browser
        const newBrowser = await browser.browserType().launch();
        const page2 = await newBrowser.newPage();
        await page2.goto(Map.url("empty"));
        await page2.evaluate(() => localStorage.setItem("debug", "*"));
        await login(page2, "test2", 5);
        await oidcAdminTagLogin(page2);

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
        await Megaphone.megaphoneRemoveRights(page, "example");
        await Megaphone.megaphoneSave(page);
        await Megaphone.isCorrectlySaved(page);
        // Megaphone should be displayed and usable by all the current users
        await Menu.isThereMegaphoneButton(page);
        await Menu.isThereMegaphoneButton(page2);
        await Menu.closeMapEditor(page);

        await Menu.toggleMegaphoneButton(page);

        // Check that the live message is displayed
        //await expect(page.locator('.menu-container #content-liveMessage h3')).toContainText('Live message', {timeout: 5_000});
        // Click on the button to start live message
        await page
            .locator(".menu-container #content-liveMessage")
            .getByRole("button", {name: "Start live message"})
            .click({timeout: 10_000});
        await page
            .locator(".menu-container #active-liveMessage")
            .getByRole("button", {name: "Start megaphone"})
            .click({timeout: 10_000});

        // click on the megaphone button to start the streaming session
        await expect(page2.locator(".cameras-container .other-cameras .jitsi-video")).toBeVisible({timeout: 15_000});

        await Menu.toggleMegaphoneButton(page);

        await page2.close();

        // TODO IN THE FUTURE (PlayWright doesn't support it) : Add test if sound is correctly played
    });

    test('Successfully set "SpeakerZone" in the map editor', async ({page, browser, request}) => {
        await resetWamMaps(request);

        await page.goto(Map.url("empty"));
        //await page.evaluate(() => { localStorage.setItem('debug', '*'); });
        //await page.reload();
        await login(page, "test", 3);
        await oidcAdminTagLogin(page);

        await Menu.openMapEditor(page);
        await MapEditor.openAreaEditor(page);
        await AreaEditor.drawArea(page, {x: 1 * 32 * 1.5, y: 5}, {x: 9 * 32 * 1.5, y: 4 * 32 * 1.5});
        await AreaEditor.addProperty(page, "Speaker zone");
        await AreaEditor.setSpeakerMegaphoneProperty(page, `${browser.browserType().name()}SpeakerZone`);
        await AreaEditor.drawArea(page, {x: 1 * 32 * 1.5, y: 6 * 32 * 1.5}, {x: 9 * 32 * 1.5, y: 9 * 32 * 1.5});
        await AreaEditor.addProperty(page, "Attendees zone");
        await AreaEditor.setListenerZoneProperty(page, `${browser.browserType().name()}SpeakerZone`.toLowerCase());
        await Menu.closeMapEditor(page);
        await Map.teleportToPosition(page, 4 * 32, 2 * 32);
        await expect(await page.locator(".jitsi-video")).toBeVisible({
            timeout: 20_000,
        });

        // Second browser
        const newBrowser = await browser.browserType().launch();
        const page2 = await newBrowser.newPage();
        await page2.goto(Map.url("empty"));
        //await page2.evaluate(() => { localStorage.setItem('debug', '*'); });
        //await page2.reload();
        await login(page2, "test2", 5);
        await oidcAdminTagLogin(page2);
        await Map.teleportToPosition(page2, 4 * 32, 7 * 32);

        // The user in the listener zone can see the speaker
        await expect(await page2.locator(".cameras-container .other-cameras .jitsi-video")).toBeVisible({
            timeout: 20_000,
        });
        // The speaker cannot see the listener
        await expect(await page.locator(".cameras-container .other-cameras .jitsi-video")).toBeHidden({timeout: 20_000});

        // Now, let's move player 2 to the speaker zone
        await Map.walkToPosition(page2, 4 * 32, 2 * 32);
        // FIXME: if we use Map.teleportToPosition, the test fails. Why?
        //await Map.teleportToPosition(page2, 4*32, 2*32);

        // The first speaker (player 1) can now see player2
        await expect(await page.locator(".cameras-container .other-cameras .jitsi-video")).toBeVisible({timeout: 20_000});
        // And the opposite is still true (player 2 can see player 1)
        await expect(await page2.locator(".cameras-container .other-cameras .jitsi-video")).toBeVisible({
            timeout: 20_000,
        });
    });

    test("Successfully set start area in the map editor", async ({page, request}) => {
        await resetWamMaps(request);
        await page.goto(Map.url("start"));
        await login(page, "test", 3);
        await oidcAdminTagLogin(page);

        await Menu.openMapEditor(page);
        await MapEditor.openAreaEditor(page);
        await AreaEditor.drawArea(page, {x: 13 * 32, y: 0}, {x: 15 * 32, y: 2 * 32});
        await AreaEditor.setAreaName(page, "MyStartZone");
        await AreaEditor.addProperty(page, "Start area");
        await Menu.closeMapEditor(page);
    });

    test("Successfully set and working exit area in the map editor", async ({page, request}) => {
        await resetWamMaps(request);

        await page.goto(Map.url("exit"));
        await login(page, "test", 3);
        await oidcAdminTagLogin(page);

        await Menu.openMapEditor(page);
        await MapEditor.openAreaEditor(page);
        await AreaEditor.drawArea(page, {x: 13 * 32, y: 13 * 32}, {x: 15 * 32, y: 15 * 32});
        await AreaEditor.addProperty(page, "Exit area");
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
    });

    // Test to set Klaxoon application in the area with the map editor
    test("Successfully set Klaxoon's application in the area in the map editor", async ({page, browser, request}) => {
        await resetWamMaps(request);

        await page.goto(Map.url("empty"));
        await login(page, "test", 3);
        await oidcAdminTagLogin(page);

        //await Menu.openMapEditor(page);
        await page.getByRole("button", {name: "toggle-map-editor"}).click();
        await MapEditor.openAreaEditor(page);
        await AreaEditor.drawArea(page, {x: 13 * 32, y: 13 * 32}, {x: 15 * 32, y: 15 * 32});
        await AreaEditor.setAreaName(page, "My app zone");

        // add property Klaxoon
        await AreaEditor.addProperty(page, "Open Klaxoon");

        // insert klaxoon link
        await page.getByPlaceholder("https://app.klaxoon.com/").first().fill("https://app.klaxoon.com/join/KXEWMSE3NF2M");
        await page.locator(".map-editor").click();

        if (browser.browserType() === webkit) {
            // Webkit is somehow failing on this, maybe it is too slow
            //eslint-disable-next-line playwright/no-skipped-test
            test.skip();
            return;
        }

        // check if the iframe activity picker is opened
        const popupPromise = page.waitForEvent("popup");
        await Map.teleportToPosition(page, 9 * 32, 9 * 32);
        await popupPromise;

        // TODO make same test with object editor
    });

    test("Successfully set GoogleWorkspace's applications in the area in the map editor", async ({page, request}) => {
        await resetWamMaps(request);

        await page.goto(Map.url("empty"));
        await login(page, "test", 3);
        await oidcAdminTagLogin(page);

        //await Menu.openMapEditor(page);
        await page.getByRole("button", {name: "toggle-map-editor"}).click();
        await MapEditor.openAreaEditor(page);
        await AreaEditor.drawArea(page, {x: 13 * 32, y: 13 * 32}, {x: 15 * 32, y: 15 * 32});

        await AreaEditor.setAreaName(page, "My app zone");

        // add property Google Docs
        await AreaEditor.addProperty(page, "Open Google Docs");
        // fill Google Docs link
        await page
            .getByPlaceholder("https://docs.google.com/document/d/1iFHmKL4HJ6WzvQI-6FlyeuCy1gzX8bWQ83dNlcTzigk/edit")
            .first()
            .fill("https://docs.google.com/document/d/1iFHmKL4HJ6WzvQI-6FlyeuCy1gzX8bWQ83dNlcTzigk/edit");

        // add property Google Sheets
        await AreaEditor.addProperty(page, "Open Google Sheets");
        // fill Google Sheets link
        await page
            .getByPlaceholder("https://docs.google.com/spreadsheets/d/1SBIn3IBG30eeq944OhT4VI_tSg-b1CbB0TV0ejK70RA/edit")
            .first()
            .fill("https://docs.google.com/spreadsheets/d/1SBIn3IBG30eeq944OhT4VI_tSg-b1CbB0TV0ejK70RA/edit");

        // add property Google Slides
        await AreaEditor.addProperty(page, "Open Google Slides");
        // fill Google Slides link
        await page
            .getByPlaceholder("https://docs.google.com/presentation/d/1fU4fOnRiDIvOoVXbksrF2Eb0L8BYavs7YSsBmR_We3g/edit")
            .first()
            .fill("https://docs.google.com/presentation/d/1fU4fOnRiDIvOoVXbksrF2Eb0L8BYavs7YSsBmR_We3g/edit");

        // add property Google Slides
        await AreaEditor.addProperty(page, "Open Google Drive");
        // fill Google Slides link
        await page
            .getByPlaceholder("https://drive.google.com/file/d/1DjNjZVbVeQO9EvgONLzCtl6wG-kxSr9Z/preview")
            .first()
            .fill("https://drive.google.com/file/d/1DjNjZVbVeQO9EvgONLzCtl6wG-kxSr9Z/preview");

        await Menu.closeMapEditor(page);

        // walk on the area position and open the popup
        await Map.walkToPosition(page, 9 * 32, 9 * 32);

        // check if the iframe was opened and button thumbnail is visible
        await expect(page.locator("#cowebsite-thumbnail-0")).toBeVisible();
        await expect(page.locator("#cowebsite-thumbnail-1")).toBeVisible();
        await expect(page.locator("#cowebsite-thumbnail-2")).toBeVisible();
    });

    test("Successfully set GoogleWorkspace's application entity in the map editor", async ({page, request}) => {
        await resetWamMaps(request);

        await page.goto(Map.url("empty"));
        await login(page, "test", 3);
        await oidcAdminTagLogin(page);

        // open map editor
        await page.getByRole("button", {name: "toggle-map-editor"}).click();
        await MapEditor.openEntityEditor(page);

        // select entity and push it into the map
        await EntityEditor.selectEntity(page, 0, "small table");
        await EntityEditor.moveAndClick(page, 14 * 32, 13 * 32);

        // quit object selector
        await EntityEditor.clearEntitySelection(page);
        await EntityEditor.moveAndClick(page, 14 * 32, 13 * 32);

        // add property Google Docs
        await EntityEditor.addProperty(page, "Open Google Docs");
        // fill Google Docs link
        await page
            .getByPlaceholder("https://docs.google.com/document/d/1iFHmKL4HJ6WzvQI-6FlyeuCy1gzX8bWQ83dNlcTzigk/edit")
            .first()
            .fill("https://docs.google.com/document/d/1iFHmKL4HJ6WzvQI-6FlyeuCy1gzX8bWQ83dNlcTzigk/edit");

        // add property Google Sheets
        await EntityEditor.addProperty(page, "Open Google Sheets");
        // fill Google Sheets link
        await page
            .getByPlaceholder("https://docs.google.com/spreadsheets/d/1SBIn3IBG30eeq944OhT4VI_tSg-b1CbB0TV0ejK70RA/edit")
            .first()
            .fill("https://docs.google.com/spreadsheets/d/1SBIn3IBG30eeq944OhT4VI_tSg-b1CbB0TV0ejK70RA/edit");

        // add property Google Slides
        await EntityEditor.addProperty(page, "Open Google Slides");
        // fill Google Slides link
        await page
            .getByPlaceholder("https://docs.google.com/presentation/d/1fU4fOnRiDIvOoVXbksrF2Eb0L8BYavs7YSsBmR_We3g/edit")
            .first()
            .fill("https://docs.google.com/presentation/d/1fU4fOnRiDIvOoVXbksrF2Eb0L8BYavs7YSsBmR_We3g/edit");

        // add property Google Drive
        await EntityEditor.addProperty(page, "Open Google Drive");
        // fill Google Drive link
        await page
            .getByPlaceholder("https://drive.google.com/file/d/1DjNjZVbVeQO9EvgONLzCtl6wG-kxSr9Z/preview")
            .first()
            .fill("https://drive.google.com/file/d/1DjNjZVbVeQO9EvgONLzCtl6wG-kxSr9Z/preview");

        // close object selector
        await Menu.closeMapEditor(page);

        // click on the object and open popup
        await EntityEditor.moveAndClick(page, 14 * 32, 13 * 32);

        // check if the popup with application is opened
        await expect(page.locator(".actions-menu .actions button").nth(0)).toContainText("Open Google Docs");
        await expect(page.locator(".actions-menu .actions button").nth(1)).toContainText("Open Google Sheets");
        await expect(page.locator(".actions-menu .actions button").nth(2)).toContainText("Open Google Slides");
        await expect(page.locator(".actions-menu .actions button").nth(3)).toContainText("Open Google Drive");
    });

    test("Successfully set Klaxoon's application entity in the map editor @local", async ({page, request}) => {
        await resetWamMaps(request);

        await page.goto(Map.url("empty"));
        await login(page, "test", 3);
        await oidcAdminTagLogin(page);

        // open map editor
        await page.getByRole("button", {name: "toggle-map-editor"}).click();
        await MapEditor.openEntityEditor(page);

        // select entity and push it into the map
        await EntityEditor.selectEntity(page, 0, "small table");
        await EntityEditor.moveAndClick(page, 14 * 32, 13 * 32);

        // quit object selector
        await EntityEditor.clearEntitySelection(page);
        await EntityEditor.moveAndClick(page, 14 * 32, 13 * 32);

        // add property Klaxoon
        await EntityEditor.addProperty(page, "Open Klaxoon");

        // fill Klaxoon link
        await page.getByPlaceholder("https://app.klaxoon.com/").first().fill("https://app.klaxoon.com/join/KXEWMSE3NF2M");

        // close object selector
        await Menu.closeMapEditor(page);

        // click on the object and open popup
        await EntityEditor.moveAndClick(page, 14 * 32, 13 * 32);

        // check if the popup with application is opened
        await expect(page.locator(".actions-menu .actions button").nth(0)).toContainText("Open Klaxoon");
    });

    // Create test for Google picker docs
    // test('Successfully open Google picker for docs', async ({ page, browser, request, browserName }) => {});
    // Create test for Google picker spreadsheet
    // Create test fir Google picker presentation
    // Create test for Google picker drive

    test("Successfully upload a custom entity", async ({page, request}) => {
        await resetWamMaps(request);

        await page.goto(Map.url("empty"));
        await login(page, "test", 3);
        await oidcAdminTagLogin(page);

        // open map editor
        await page.getByRole("button", {name: "toggle-map-editor"}).click();
        await MapEditor.openEntityEditor(page);

        // Click on upload asset
        await EntityEditor.uploadTestAsset(page);

        // Search uploaded asset
        const uploadedEntityLocator = await EntityEditor.searchEntity(page, EntityEditor.getTestAssetName());
        const uploadedEntityElement = await uploadedEntityLocator.innerHTML();
        expect(uploadedEntityElement).toContain(EntityEditor.getTestAssetName());
    });

    test("Successfully upload and use custom entity in the map", async ({page, browser, request}) => {
        await resetWamMaps(request);

        // First browser + moved woka
        await page.goto(Map.url("empty"));
        await login(page, "test", 3);
        await oidcAdminTagLogin(page);
        await Map.teleportToPosition(page, 0, 0);

        // Second browser
        const newBrowser = await browser.browserType().launch();
        const page2 = await newBrowser.newPage();
        await page2.goto(Map.url("empty"));
        await login(page2, "test2", 3);
        await oidcAdminTagLogin(page2);

        // open map editor
        await page.getByRole("button", {name: "toggle-map-editor"}).click();
        await MapEditor.openEntityEditor(page);

        // Click on upload asset
        await EntityEditor.uploadTestAsset(page);

        // Select uploaded entity and move it to the map
        await EntityEditor.selectEntity(page, 0, EntityEditor.getTestAssetName(), EntityEditor.getTestAssetName());
        await EntityEditor.moveAndClick(page, 6 * 32, 6 * 32);

        // Add open link interaction on uploaded asset
        await EntityEditor.clearEntitySelection(page);
        await EntityEditor.moveAndClick(page, 6 * 32, 6 * 32);
        await EntityEditor.addProperty(page, "Open Link");

        // fill link
        await page.getByPlaceholder("https://workadventu.re").first().fill("https://workadventu.re");

        // close object selector
        await Menu.closeMapEditor(page);

        // click on the object and open popup on both pages
        await EntityEditor.moveAndClick(page, 6 * 32, 6 * 32);
        await EntityEditor.moveAndClick(page2, 6 * 32, 6 * 32);

        // check if the popup with application is opened on both pages
        await expect(page.locator(".actions-menu .actions button").nth(0)).toContainText("Open Link");
        await expect(page2.locator(".actions-menu .actions button").nth(0)).toContainText("Open Link");
    });

    test("Successfully upload and edit asset name", async ({page, browser, request}) => {
        // Init wam file
        await resetWamMaps(request);

        // First browser + moved woka
        await page.goto(Map.url("empty"));
        await login(page, "test", 3);
        await oidcAdminTagLogin(page);
        await Map.teleportToPosition(page, 0, 0);

        // Second browser
        const newBrowser = await browser.browserType().launch();
        const page2 = await newBrowser.newPage();
        await page2.goto(Map.url("empty"));
        await login(page2, "test2", 3);
        await oidcAdminTagLogin(page2);

        // open map editor on both pages
        await page.getByRole("button", {name: "toggle-map-editor"}).click();
        await page2.getByRole("button", {name: "toggle-map-editor"}).click();
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

        // Search uploaded entity on both pages
        const uploadedEntityLocator = await EntityEditor.searchEntity(page, newEntityName);
        const uploadedEntityLocator2 = await EntityEditor.searchEntity(page2, newEntityName);

        // Get inner html on both pages
        const uploadedEntityElement = await uploadedEntityLocator.innerHTML();
        const uploadedEntityElement2 = await uploadedEntityLocator2.innerHTML();

        // Expect inner html in string to contain the new entity name
        expect(uploadedEntityElement).toContain(newEntityName);
        expect(uploadedEntityElement2).toContain(newEntityName);
    });

    test("Successfully upload and remove custom entity", async ({page, browser, request}) => {
        await resetWamMaps(request);

        // First browser + moved woka
        await page.goto(Map.url("empty"));
        await login(page, "test", 3);
        await oidcAdminTagLogin(page);

        await Map.teleportToPosition(page, 0, 0);

        // Second browser
        const newBrowser = await browser.browserType().launch();
        const page2 = await newBrowser.newPage();
        await page2.goto(Map.url("empty"));
        await login(page2, "test2", 3);
        await oidcAdminTagLogin(page2);

        // open map editor on both pages
        await page.getByRole("button", {name: "toggle-map-editor"}).click();
        await page2.getByRole("button", {name: "toggle-map-editor"}).click();

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
    });

    test("Successfully set searchable processus for entity and zone", async ({page, browser, request}) => {
        await resetWamMaps(request);
        await page.goto(Map.url("empty"));
        await login(page, "test", 3);
        await oidcAdminTagLogin(page);

        // Open the map editor
        await Menu.openMapEditor(page);

        // Area
        await MapEditor.openAreaEditor(page);
        await AreaEditor.drawArea(page, {x: 1 * 32 * 1.5, y: 5}, {x: 9 * 32 * 1.5, y: 4 * 32 * 1.5});
        await AreaEditor.setAreaName(page, "My Focusable Zone");
        await AreaEditor.setAreaDescription(
            page,
            "This is a focus zone to test the search feature in the exploration mode. It should be searchable."
        );
        await AreaEditor.setAreaSearcheable(page, true);
        await AreaEditor.addProperty(page, "Focusable");

        // Entity
        // Webkit is somehow failing on this, maybe it is too slow
        if (browser.browserType() !== webkit) {
            //eslint-disable-next-line playwright/no-skipped-test
            await MapEditor.openEntityEditor(page);
            await EntityEditor.selectEntity(page, 0, "small table");
            await EntityEditor.moveAndClick(page, 14 * 32, 13 * 32);
            await EntityEditor.clearEntitySelection(page);
            await EntityEditor.moveAndClick(page, 14 * 32, 13 * 32);
            await EntityEditor.setEntityName(page, "My Jitsi Entity");
            await EntityEditor.setEntityDescription(
                page,
                "This is a Jitsi entity to test the search feature in the exploration mode. It should be searchable."
            );
            await EntityEditor.setEntitySearcheable(page, true);
            await EntityEditor.addProperty(page, "Jitsi Room");
        }

        // Open the map exploration mode
        await MapEditor.openExploration(page);

    // Expected 1 entity and 1 zone in the search result
        // With webkit, something wrong to put an object and clik on it, so in this case, we don't have an object
        if (browser.browserType() !== webkit) {
            // Test if the entity is searchable
            await expect(page.locator(".map-editor .sidebar .entities")).toContainText("1 objects found");
            await page.locator(".map-editor .sidebar .entities").click();
            expect(await page.locator(".map-editor .sidebar .entity-items .item").count()).toBe(1);
        } else {
            // For webkit, we don't have an object
            await expect(page.locator(".map-editor .sidebar .entities")).toContainText("No entity found in the room 🙅‍♂️");
        }

        // Test if the area is searchable
        await expect(page.locator(".map-editor .sidebar .areas")).toContainText("1 areas found");
        await page.locator(".map-editor .sidebar .areas").click();
        expect(await page.locator(".map-editor .sidebar .area-items .item").count()).toBe(1);
    });

    test("Successfully test global message text and sound feature", async ({page, browser, request}) => {
        await resetWamMaps(request);
        await page.goto(Map.url("empty"));

        await login(page, "test", 3);
        await oidcAdminTagLogin(page);

        // Move user and not create discussion with the second user
        await Map.teleportToPosition(page, 5 * 32, 5 * 32);

        // Second browser
        const newBrowser = await browser.browserType().launch();
        const page2 = await newBrowser.newPage();
        await page2.goto(Map.url("empty"));
        await page2.evaluate(() => localStorage.setItem("debug", "*"));
        await login(page2, "test2", 5);

        // Open the map editor and configure the megaphone to have accès to the global message
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
        await Megaphone.megaphoneRemoveRights(page, "example");
        await Megaphone.megaphoneSave(page);
        await Megaphone.isCorrectlySaved(page);
        // Megaphone should be displayed and usable by all the current users
        await Menu.isThereMegaphoneButton(page);
        await Menu.isThereMegaphoneButton(page2);
        await Menu.closeMapEditor(page);

        // TODO : create this test in admin part (global message and text audio message if an admin feature)
        // TODO : change to use the global message feature for user through megaphon settings rights

        await page2.close();
        await page.close();
        // TODO IN THE FUTURE (PlayWright doesn't support it) : Add test if sound is correctly played
    });
});
