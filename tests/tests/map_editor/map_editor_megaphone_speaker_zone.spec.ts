import {expect, test} from "@playwright/test";
import Map from "../utils/map";
import AreaEditor from "../utils/map-editor/areaEditor";
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

    test("Successfully set the megaphone feature", async ({ browser, request }) => {
        await resetWamMaps(request);
        await using page = await getPage(browser, "Admin1", Map.url("empty"));
        // Because webkit in playwright does not support Camera/Microphone Permission by settings
        await Map.teleportToPosition(page, 5 * 32, 5 * 32);

        // Second browser
        await using page2 = await getPage(browser, 'Admin2', Map.url("empty"));

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
        // Close the room settings popup
        await Menu.closeMapEditorConfigureMyRoomPopUp(page);

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
        // Close the configuration popup
        await Menu.closeMapEditorConfigureMyRoomPopUp(page);
        
        // Megaphone should be displayed and usable by all the current users
        await Menu.isThereMegaphoneButton(page);
        await Menu.isThereMegaphoneButton(page2);

        // Update the megaphone button
        await Menu.toggleMegaphoneButton(page);


        // Click on the button to start live message
        await expect(page.getByRole('button', { name: 'Start live message' })).toBeVisible();
        await page.getByRole('button', { name: 'Start live message' }).click({ timeout: 10_000 });
        // Click on the button to start megaphone
        await expect(page.getByRole('button', { name: 'Start megaphone' })).toBeVisible();
        await page.getByRole('button', { name: 'Start megaphone' }).click({ timeout: 10_000 });


        // click on the megaphone button to start the streaming session
        await expect(page2.getByText('Admin1', { exact: true })).toBeVisible({ timeout: 15_000 });

        await page.getByRole('button', { name: 'Stop megaphone' }).click();
        await expect(page.getByRole('heading', { name: 'Global communication' })).toBeHidden();


        await page2.context().close();

        await page.context().close();
        // TODO IN THE FUTURE (PlayWright doesn't support it) : Add test if sound is correctly played
    });

    test('Successfully set "SpeakerZone" in the map editor', async ({ browser, request }) => {
        // skip the test, speaker zone with Jitsi is deprecated
        await resetWamMaps(request);
        await using page = await getPage(browser, "Admin1", Map.url("empty"));
        //await page.evaluate(() => { localStorage.setItem('debug', '*'); });
        //await page.reload();

        await Menu.openMapEditor(page);
        await MapEditor.openAreaEditor(page);
        // await expect(page.locator('canvas')).toBeVisible();
        await AreaEditor.drawArea(page, { x: 1 * 32 * 1.5, y: 2 * 32 * 1.5 }, { x: 9 * 32 * 1.5, y: 4 * 32 * 1.5 });
        await AreaEditor.addProperty(page, "speakerMegaphone");
        await AreaEditor.setPodiumNameProperty(page, `${browser.browserType().name()}SpeakerZone`);
        await AreaEditor.drawArea(page, { x: 1 * 32 * 1.5, y: 6 * 32 * 1.5 }, { x: 9 * 32 * 1.5, y: 9 * 32 * 1.5 });
        await AreaEditor.addProperty(page, "listenerMegaphone");
        await AreaEditor.setMatchingPodiumZoneProperty(page, `${browser.browserType().name()}SpeakerZone`.toLowerCase());
        await Menu.closeMapEditor(page);
        await Map.teleportToPosition(page, 4 * 32, 3 * 32);

        await expect(page.locator('#cameras-container').getByText('You')).toBeVisible();

        // Second browser
        await using page2 = await getPage(browser, "Admin2", Map.url("empty"));

        await Map.teleportToPosition(page2, 4 * 32, 7 * 32);

        // The user in the listener zone can see the speaker
        await expect(page2.locator('#cameras-container').getByText('Admin1')).toBeVisible({ timeout: 20_000 });
        await expect.poll(async() => await page2.getByTestId('webrtc-video').count()).toBe(1);
        // The speaker cannot see the listener
        await expect(page.locator('#cameras-container').getByText('Admin2')).toBeHidden({ timeout: 20_000 });



        // Now, let's move player 2 to the speaker zone
        await Map.walkToPosition(page2, 4 * 32, 3 * 32);
        // FIXME: if we use Map.teleportToPosition, the test fails. Why?
        //await Map.teleportToPosition(page2, 4*32, 2*32);

        // The first speaker (player 1) can now see player2
        await expect(page.locator('#cameras-container').getByText('Admin2')).toBeVisible({ timeout: 20_000 });
        // And the opposite is still true (player 2 can see player 1)
        await expect(page2.locator('#cameras-container').getByText('Admin1')).toBeVisible({ timeout: 20_000 });

        await expect.poll(async() => await page.getByTestId('webrtc-video').count()).toBe(2);
        await expect.poll(async() => await page2.getByTestId('webrtc-video').count()).toBe(2);

        await page2.context().close();

        await page.context().close();
    });


    test('Successfully set "SpeakerZone" with chat in the map editor', async ({ browser, request }) => {
        // skip the test, speaker zone with Jitsi is deprecated
        await resetWamMaps(request);
        await using page = await getPage(browser, "Admin1", Map.url("empty"));
        //await page.evaluate(() => { localStorage.setItem('debug', '*'); });
        //await page.reload();

        await Menu.openMapEditor(page);
        await MapEditor.openAreaEditor(page);
        // await expect(page.locator('canvas')).toBeVisible();
        await AreaEditor.drawArea(page, { x: 1 * 32 * 1.5, y: 2 * 32 * 1.5 }, { x: 9 * 32 * 1.5, y: 4 * 32 * 1.5 });
        await AreaEditor.addProperty(page, "speakerMegaphone");
        await AreaEditor.setPodiumNameProperty(page, `${browser.browserType().name()}SpeakerZone`,true);
        await AreaEditor.drawArea(page, { x: 1 * 32 * 1.5, y: 6 * 32 * 1.5 }, { x: 9 * 32 * 1.5, y: 9 * 32 * 1.5 });
        await AreaEditor.addProperty(page, "listenerMegaphone");
        await AreaEditor.setMatchingPodiumZoneProperty(page, `${browser.browserType().name()}SpeakerZone`.toLowerCase(),true);
        await Menu.closeMapEditor(page);
        await Map.teleportToPosition(page, 4 * 32, 3 * 32);

        await expect(page.locator('#cameras-container').getByText('You')).toBeVisible();

        // Second browser
        await using page2 = await getPage(browser, "Admin2", Map.url("empty"));

        await Map.teleportToPosition(page2, 4 * 32, 7 * 32);

        // The user in the listener zone can see the speaker
        await expect(page2.locator('#cameras-container').getByText('Admin1')).toBeVisible({ timeout: 20_000 });
        await expect.poll(async() => await page2.getByTestId('webrtc-video').count()).toBe(1);
        // The speaker cannot see the listener
        await expect(page.locator('#cameras-container').getByText('Admin2')).toBeHidden({ timeout: 20_000 });

        await page.getByTestId('chat-btn').click();
        await page2.getByTestId('chat-btn').click();


        await page.getByTestId('messageInput').fill('Hello from Admin1');
        await page.getByTestId('sendMessageButton').click();
        await expect(page2.locator('#message').getByText('Hello from Admin1')).toBeVisible({ timeout: 20_000 });

        await page2.getByTestId('messageInput').fill('Hello from Admin2');
        await page2.getByTestId('sendMessageButton').click();
        await expect(page.locator('#message').getByText('Hello from Admin2')).toBeVisible({ timeout: 20_000 });



        // Now, let's move player 2 to the speaker zone
        await Map.walkToPosition(page2, 4 * 32, 3 * 32);
        // FIXME: if we use Map.teleportToPosition, the test fails. Why?
        //await Map.teleportToPosition(page2, 4*32, 2*32);

        // The first speaker (player 1) can now see player2
        await expect(page.locator('#cameras-container').getByText('Admin2')).toBeVisible({ timeout: 20_000 });
        // And the opposite is still true (player 2 can see player 1)
        await expect(page2.locator('#cameras-container').getByText('Admin1')).toBeVisible({ timeout: 20_000 });

        await expect.poll(async() => await page.getByTestId('webrtc-video').count()).toBe(2);
        await expect.poll(async() => await page2.getByTestId('webrtc-video').count()).toBe(2);

        await page2.getByTestId('chat-btn').click();

        await page.getByTestId('messageInput').fill('Hello from Admin1 again');
        await page.getByTestId('sendMessageButton').click();
        await expect(page2.locator('#message').getByText('Hello from Admin1 again')).toBeVisible({ timeout: 20_000 });


        await page2.context().close();

        await page.context().close();
    });
});
