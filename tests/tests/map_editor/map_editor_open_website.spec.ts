import {expect, test} from "@playwright/test";
import Map from "../utils/map";
import AreaEditor from "../utils/map-editor/areaEditor";
import EntityEditor from "../utils/map-editor/entityEditor";
import {resetWamMaps} from "../utils/map-editor/uploader";
import MapEditor from "../utils/mapeditor";
import Menu from "../utils/menu";
import {map_storage_url, maps_test_url} from "../utils/urls";
import {getPage} from "../utils/auth";
import {isMobile} from "../utils/isMobile";
import {assertLogMessage, startRecordLogs} from "../utils/log";

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

    test("Successfully set open website area in the map editor, with working Scripting API @nofirefox", async ({ browser, request }) => {
        await resetWamMaps(request);
        await using page = await getPage(browser, "Admin1", Map.url("empty"));

        await Menu.openMapEditor(page);
        await MapEditor.openAreaEditor(page);
        await AreaEditor.drawArea(page, { x: 8 * 32 * 1.5, y: 8 * 32 * 1.5 }, { x: 10 * 32 * 1.5, y: 10 * 32 * 1.5 });
        await AreaEditor.setAreaName(page, "My app zone");

        await AreaEditor.addProperty(page, "openWebsite");
        await page.getByRole('textbox', { name: 'Link URL' }).fill(maps_test_url+'iframe.php');
        await page.getByText('Link URL').click();

        await Map.teleportToPosition(page, 9 * 32, 9 * 32);

        // Let's check a warning message is displayed in the logs saying the Allow API checkbox is not checked
        startRecordLogs(page);

        await page.locator('iframe[title="Cowebsite"]').contentFrame().getByRole('button', { name: 'Send chat message' }).click();

        await assertLogMessage(page, 'It seems an iFrame is trying to communicate with WorkAdventure');

        await Map.teleportToPosition(page, 0, 0);

        // eslint-disable-next-line playwright/no-force-option
        await page.locator('#allowAPI').check({ force: true });

        await Map.teleportToPosition(page, 9 * 32, 9 * 32);

        await page.locator('iframe[title="Cowebsite"]').contentFrame().getByRole('button', { name: 'Send chat message' }).click();

        await expect(page.getByText('Hello world!')).toBeVisible();

        await page.context().close();
    });


    // Test to set Klaxoon application in the area with the map editor
    test("Successfully set Klaxoon's application in the area in the map editor", async ({ browser, request }) => {
        test.skip(process.env.IS_FORK === "true", "Skip Klaxoon test on forked PR because the secret env variable is not set");

        await resetWamMaps(request);
        await using page = await getPage(browser, "Admin1", Map.url("empty"));

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

        await page.context().close();
    });

    test("Successfully set GoogleWorkspace's applications in the area in the map editor", async ({ browser, request }) => {
        await resetWamMaps(request);
        await using page = await getPage(browser, "Admin1", Map.url("empty"));

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

        // fill Google Drive link
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


        await page.context().close();
    });

    test("Successfully set GoogleWorkspace's application entity in the map editor", async ({ browser, request }) => {
        await resetWamMaps(request);
        await using page = await getPage(browser, "Admin1", Map.url("empty"));

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

        // Check that the button close the popup is visible
        await expect(page.getByTestId('closeActionsMenuButton')).toBeVisible();


        await page.context().close();
    });

    test("Successfully set Klaxoon's application entity in the map editor @local", async ({ browser, request }) => {
        await resetWamMaps(request);
        await using page = await getPage(browser, "Admin1", Map.url("empty"));

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

        // check if the cowebsite is opened
        await expect(page.locator('#cowebsites-container')).toBeVisible();
        await expect(page.locator('#cowebsites-container')).toContainText('https://app.klaxoon.com/join/KXEWMSE3NF2M');
        expect(page.locator('iframe[src="https://app.klaxoon.com/join/KXEWMSE3NF2M"]').contentFrame()).toBeTruthy();


        await page.context().close();
    });

    // Create test for Google picker docs
    // test('Successfully open Google picker for docs', async ({ page, browser, request, browserName }) => {});
    // Create test for Google picker spreadsheet
    // Create test for Google picker presentation
    // Create test for Google picker drive

});
