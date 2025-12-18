import * as fs from 'fs';
import * as path from 'path';
import {expect, test} from "@playwright/test";
import Map from "../utils/map";
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


    test("Successfully upload a custom entity", async ({ browser, request }) => {
        await resetWamMaps(request);
        await using page = await getPage(browser, "Admin1", Map.url("empty"));

        // open map editor
        await Menu.openMapEditor(page);
        await MapEditor.openEntityEditor(page);

        // Click on upload asset
        await EntityEditor.uploadTestAsset(page);

        // Search uploaded asset
        const uploadedEntityLocator = await EntityEditor.searchEntity(page, EntityEditor.getTestAssetName());
        const uploadedEntityElement = await uploadedEntityLocator.innerHTML();
        expect(uploadedEntityElement).toContain(EntityEditor.getTestAssetName());


        await page.context().close();
    });

    test("Successfully upload and use custom entity in the map", async ({ browser, request }) => {
        await resetWamMaps(request);

        // First browser + moved woka
        await using page = await getPage(browser, "Admin1", Map.url("empty"));
        await Map.teleportToPosition(page, 0, 0);

        // Second browser
        await using page2 = await getPage(browser, "Admin2", Map.url("empty"));

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

        // Check if the cowebsite is opened
        await expect(page.locator('#cowebsites-container')).toBeVisible();
        await expect(page2.locator('#cowebsites-container')).toBeVisible();
        // Check if the url of website is visible
        await expect(page.locator('#cowebsites-container')).toContainText('https://workadventu.re');
        await expect(page2.locator('#cowebsites-container')).toContainText('https://workadventu.re');
        // Check if the iframe is visible with src https://workadventu.re/
        expect(page.locator('iframe[src="https://workadventu.re/"]').contentFrame()).toBeTruthy();
        expect(page2.locator('iframe[src="https://workadventu.re/"]').contentFrame()).toBeTruthy();


        await page2.context().close();
        await page.context().close();
    });


    test("Successfully upload and use custom entity with odd size in the map", async ({ browser, request }) => {
        await resetWamMaps(request);

        // First browser + moved woka
        await using page = await getPage(browser, "Admin1", Map.url("empty"));
        await Map.teleportToPosition(page, 0, 0);

        // Second browser
        const newBrowser = await browser.newContext();
        await using page2 = await getPage(browser, "Admin1", Map.url("empty"));

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


        // Check if the cowebsite is opened
        await expect(page.locator('#cowebsites-container')).toBeVisible();
        await expect(page2.locator('#cowebsites-container')).toBeVisible();
        // Check that the url of website is visible
        await expect(page.locator('#cowebsites-container')).toContainText('https://workadventu.re');
        await expect(page2.locator('#cowebsites-container')).toContainText('https://workadventu.re');
        // Check that the iframe is visible with src https://workadventu.re/
        expect(page.locator('iframe[src="https://workadventu.re/"]').contentFrame()).toBeTruthy();
        expect(page2.locator('iframe[src="https://workadventu.re/"]').contentFrame()).toBeTruthy();


        await newBrowser.close();

        await page.context().close();
    });

    test("Successfully upload and edit asset name", async ({ browser, request }) => {
        // Init wam file
        await resetWamMaps(request);

        // First browser + moved woka
        await using page = await getPage(browser, "Admin1", Map.url("empty"));
        await Map.teleportToPosition(page, 0, 0);

        // Second browser
        await using page2 = await getPage(browser, "Admin2", Map.url("empty"));

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


        await page2.context().close();
        await page.close();
        await page.context().close();
    });

    test("Successfully upload and remove custom entity", async ({ browser, request }) => {
        await resetWamMaps(request);

        // First browser + moved woka
        await using page = await getPage(browser, "Admin1", Map.url("empty"));

        await Map.teleportToPosition(page, 0, 0);

        // Second browser
        await using page2 = await getPage(browser, "Admin2", Map.url("empty"));

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


        await page2.context().close();
        await page.close();
        await page.context().close();
    });

    test('drop PDF file onto canvas inside #game', async ({ browser, request }) => {
        await resetWamMaps(request);
        await using page = await getPage(browser, 'Admin1', Map.url('empty'));

        // Prepare file
        const filePath = path.join(__dirname, '../assets/lorem-ipsum.pdf');
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

        await EntityEditor.moveAndClick(page, 32, 300);

        await expect(page.getByText('Books (Variant 5)')).toBeVisible();
        await expect(page.getByText('lorem-ipsum.pdf')).toBeVisible();
    });
});
