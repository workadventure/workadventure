import { expect, test } from "@playwright/test";
import Map from "../utils/map";
import AreaEditor from "../utils/map-editor/areaEditor";
import ConfigureMyRoom from "../utils/map-editor/configureMyRoom";
import Megaphone from "../utils/map-editor/megaphone";
import { resetWamMaps } from "../utils/map-editor/uploader";
import MapEditor from "../utils/mapeditor";
import Menu from "../utils/menu";
import { map_storage_url } from "../utils/urls";
import { getPage } from "../utils/auth";
import { isMobile } from "../utils/isMobile";

test.setTimeout(240_000); // Fix Webkit that can take more than 60s
test.use({
    baseURL: map_storage_url,
});

test.describe("Map editor @oidc @nomobile @nowebkit", () => {
    test.beforeEach("Ignore tests on mobile because map editor not available for mobile devices", ({ page }) => {
        // Map Editor not available on mobile
        test.skip(isMobile(page), "Map editor is not available on mobile");
    });

    test.beforeEach("Ignore tests on webkit because of issue with camera and microphone", ({ browserName }) => {
        // WebKit has issue with camera
        test.skip(browserName === "webkit", "WebKit has issues with camera/microphone");
    });

    test("Successfully set the megaphone feature", async ({ browser, request }) => {
        await resetWamMaps(request);
        await using page = await getPage(browser, "Admin1", Map.url("empty"));
        // Because webkit in playwright does not support Camera/Microphone Permission by settings
        await Map.teleportToPosition(page, 5 * 32, 5 * 32);

        // Second browser
        await using page2 = await getPage(browser, "Admin2", Map.url("empty"));

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
        await expect(page.getByRole("button", { name: "Start live message" })).toBeVisible();
        await page.getByRole("button", { name: "Start live message" }).click({ timeout: 10_000 });
        // Click on the button to start megaphone
        await expect(page.getByRole("button", { name: "Start megaphone" })).toBeVisible();
        await page.getByRole("button", { name: "Start megaphone" }).click({ timeout: 10_000 });

        // click on the megaphone button to start the streaming session
        await expect(page2.getByText("Admin1", { exact: true })).toBeVisible({ timeout: 15_000 });

        await page.getByRole("button", { name: "Stop megaphone" }).click();
        await expect(page.getByRole("heading", { name: "Global communication" })).toBeHidden();

        await page2.context().close();

        await page.context().close();
        // TODO IN THE FUTURE (PlayWright doesn't support it) : Add test if sound is correctly played
    });

    test("Successfully set the megaphone feature with auditorium option", async ({ browser, request }) => {
        await resetWamMaps(request);
        await using page = await getPage(browser, "Admin1", Map.url("empty"));
        // Because webkit in playwright does not support Camera/Microphone Permission by settings
        await Map.teleportToPosition(page, 5 * 32, 5 * 32);

        // Second browser
        await using page2 = await getPage(browser, "Admin2", Map.url("empty"));

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
        await Megaphone.enableAuditoriumMode(page);
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
        await expect(page.getByRole("button", { name: "Start live message" })).toBeVisible();
        await page.getByRole("button", { name: "Start live message" }).click({ timeout: 10_000 });
        // Click on the button to start megaphone
        await expect(page.getByRole("button", { name: "Start megaphone" })).toBeVisible();
        await page.getByRole("button", { name: "Start megaphone" }).click({ timeout: 10_000 });

        // click on the megaphone button to start the streaming session
        await expect(page2.getByText("Admin1", { exact: true })).toBeVisible({ timeout: 15_000 });

        await expect(page.getByText("Admin2", { exact: true })).toBeVisible({ timeout: 15_000 });

        await page.getByRole("button", { name: "Stop megaphone" }).click();
        await expect(page.getByRole("heading", { name: "Global communication" })).toBeHidden();

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
        await AreaEditor.setMatchingPodiumZoneProperty(
            page,
            `${browser.browserType().name()}SpeakerZone`.toLowerCase(),
        );
        await Menu.closeMapEditor(page);
        await Map.teleportToPosition(page, 4 * 32, 3 * 32);

        await expect(page.locator("#cameras-container").getByText("You")).toBeVisible();

        // Second browser
        await using page2 = await getPage(browser, "Admin2", Map.url("empty"));

        await Map.teleportToPosition(page2, 4 * 32, 7 * 32);

        // The user in the listener zone can see the speaker
        await expect(page2.locator("#cameras-container").getByText("Admin1")).toBeVisible({ timeout: 20_000 });
        await expect.poll(async () => await page2.getByTestId("webrtc-video").count()).toBe(1);
        // The speaker cannot see the listener
        await expect(page.locator("#cameras-container").getByText("Admin2")).toBeHidden({ timeout: 20_000 });

        // Now, let's move player 2 to the speaker zone
        await Map.walkToPosition(page2, 4 * 32, 3 * 32);
        // FIXME: if we use Map.teleportToPosition, the test fails. Why?
        //await Map.teleportToPosition(page2, 4*32, 2*32);

        // The first speaker (player 1) can now see player2
        await expect(page.locator("#cameras-container").getByText("Admin2")).toBeVisible({ timeout: 20_000 });
        // And the opposite is still true (player 2 can see player 1)
        await expect(page2.locator("#cameras-container").getByText("Admin1")).toBeVisible({ timeout: 20_000 });

        await expect.poll(async () => await page.getByTestId("webrtc-video").count()).toBe(2);
        await expect.poll(async () => await page2.getByTestId("webrtc-video").count()).toBe(2);

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
        await AreaEditor.setPodiumNameProperty(page, `${browser.browserType().name()}SpeakerZone`, true);
        await AreaEditor.drawArea(page, { x: 1 * 32 * 1.5, y: 6 * 32 * 1.5 }, { x: 9 * 32 * 1.5, y: 9 * 32 * 1.5 });
        await AreaEditor.addProperty(page, "listenerMegaphone");
        await AreaEditor.setMatchingPodiumZoneProperty(
            page,
            `${browser.browserType().name()}SpeakerZone`.toLowerCase(),
            true,
        );
        await Menu.closeMapEditor(page);
        await Map.teleportToPosition(page, 4 * 32, 3 * 32);

        await expect(page.locator("#cameras-container").getByText("You")).toBeVisible();

        // Second browser
        await using page2 = await getPage(browser, "Admin2", Map.url("empty"));

        await Map.teleportToPosition(page2, 4 * 32, 7 * 32);

        // The user in the listener zone can see the speaker
        await expect(page2.locator("#cameras-container").getByText("Admin1")).toBeVisible({ timeout: 20_000 });
        await expect.poll(async () => await page2.getByTestId("webrtc-video").count()).toBe(1);
        // The speaker cannot see the listener
        await expect(page.locator("#cameras-container").getByText("Admin2")).toBeHidden({ timeout: 20_000 });

        await page.getByTestId("chat-btn").click();
        await page2.getByTestId("chat-btn").click();

        await page.getByTestId("messageInput").fill("Hello from Admin1");
        await page.getByTestId("sendMessageButton").click();
        await expect(page2.locator("#message").getByText("Hello from Admin1")).toBeVisible({ timeout: 20_000 });

        await page2.getByTestId("messageInput").fill("Hello from Admin2");
        await page2.getByTestId("sendMessageButton").click();
        await expect(page.locator("#message").getByText("Hello from Admin2")).toBeVisible({ timeout: 20_000 });

        // Now, let's move player 2 to the speaker zone
        await Map.walkToPosition(page2, 4 * 32, 3 * 32);
        // FIXME: if we use Map.teleportToPosition, the test fails. Why?
        //await Map.teleportToPosition(page2, 4*32, 2*32);

        // The first speaker (player 1) can now see player2
        await expect(page.locator("#cameras-container").getByText("Admin2")).toBeVisible({ timeout: 20_000 });
        // And the opposite is still true (player 2 can see player 1)
        await expect(page2.locator("#cameras-container").getByText("Admin1")).toBeVisible({ timeout: 20_000 });

        await expect.poll(async () => await page.getByTestId("webrtc-video").count()).toBe(2);
        await expect.poll(async () => await page2.getByTestId("webrtc-video").count()).toBe(2);

        await page2.getByTestId("chat-btn").click();

        await page.getByTestId("messageInput").fill("Hello from Admin1 again");
        await page.getByTestId("sendMessageButton").click();
        await expect(page2.locator("#message").getByText("Hello from Admin1 again")).toBeVisible({ timeout: 20_000 });

        await page2.context().close();

        await page.context().close();
    });

    test('Successfully set "SpeakerZone" with see attendees option in the map editor', async ({ browser, request }) => {
        await resetWamMaps(request);
        await using page = await getPage(browser, "Admin1", Map.url("empty"));
        //await page.evaluate(() => { localStorage.setItem('debug', '*'); });
        //await page.reload();

        await Menu.openMapEditor(page);
        await MapEditor.openAreaEditor(page);
        // await expect(page.locator('canvas')).toBeVisible();
        await AreaEditor.drawArea(page, { x: 1 * 32 * 1.5, y: 2 * 32 * 1.5 }, { x: 9 * 32 * 1.5, y: 4 * 32 * 1.5 });
        await AreaEditor.addProperty(page, "speakerMegaphone");
        await AreaEditor.setPodiumNameProperty(page, `${browser.browserType().name()}SpeakerZone`, true, true);
        await AreaEditor.drawArea(page, { x: 1 * 32 * 1.5, y: 6 * 32 * 1.5 }, { x: 9 * 32 * 1.5, y: 9 * 32 * 1.5 });
        await AreaEditor.addProperty(page, "listenerMegaphone");
        await AreaEditor.setMatchingPodiumZoneProperty(
            page,
            `${browser.browserType().name()}SpeakerZone`.toLowerCase(),
            true,
        );
        await Menu.closeMapEditor(page);
        await Map.teleportToPosition(page, 4 * 32, 3 * 32);

        await expect(page.locator("#cameras-container").getByText("You")).toBeVisible();

        // Second browser
        await using page2 = await getPage(browser, "Admin2", Map.url("empty"));
        await using page3 = await getPage(browser, "John", Map.url("empty"));

        await Map.teleportToPosition(page2, 4 * 32, 7 * 32);

        // The user in the listener zone can see the speaker
        await expect(page2.locator("#cameras-container").getByText("Admin1")).toBeVisible({ timeout: 20_000 });
        await expect.poll(async () => await page2.getByTestId("webrtc-video").count()).toBe(2);
        // The speaker can see the listener
        await expect(page.locator("#cameras-container").getByText("Admin2")).toBeVisible({ timeout: 20_000 });
        await expect.poll(async () => await page.getByTestId("webrtc-video").count()).toBe(2);

        await Map.teleportToPosition(page3, 4 * 32, 7 * 32);

        // Admin2 can only see Admin1
        await expect(page2.locator("#cameras-container").getByText("Admin1")).toBeVisible({ timeout: 20_000 });
        await expect.poll(async () => await page2.getByTestId("webrtc-video").count()).toBe(2);

        //the speaker can see John and Admin2
        await expect(page.locator("#cameras-container").getByText("John")).toBeVisible({ timeout: 20_000 });
        await expect.poll(async () => await page.getByTestId("webrtc-video").count()).toBe(3);

        await page.getByTestId("chat-btn").click();
        await page2.getByTestId("chat-btn").click();

        await page.getByTestId("messageInput").fill("Hello from Admin1");
        await page.getByTestId("sendMessageButton").click();
        await expect(page2.locator("#message").getByText("Hello from Admin1")).toBeVisible({ timeout: 20_000 });

        await page2.getByTestId("messageInput").fill("Hello from Admin2");
        await page2.getByTestId("sendMessageButton").click();
        await expect(page.locator("#message").getByText("Hello from Admin2")).toBeVisible({ timeout: 20_000 });

        // Now, let's move player 2 to the speaker zone
        await Map.walkToPosition(page2, 4 * 32, 3 * 32);
        // FIXME: if we use Map.teleportToPosition, the test fails. Why?
        //await Map.teleportToPosition(page2, 4*32, 2*32);

        // The first speaker (player 1) can now see player2
        await expect(page.locator("#cameras-container").getByText("Admin2")).toBeVisible({ timeout: 20_000 });
        await expect(page.locator("#cameras-container").getByText("John")).toBeVisible({ timeout: 20_000 });
        // And the opposite is still true (player 2 can see player 1)
        await expect(page2.locator("#cameras-container").getByText("Admin1")).toBeVisible({ timeout: 20_000 });
        await expect(page2.locator("#cameras-container").getByText("John")).toBeVisible({ timeout: 20_000 });

        await expect.poll(async () => await page.getByTestId("webrtc-video").count()).toBe(3);
        await expect.poll(async () => await page2.getByTestId("webrtc-video").count()).toBe(3);

        await page2.getByTestId("chat-btn").click();

        await page.getByTestId("messageInput").fill("Hello from Admin1 again");
        await page.getByTestId("sendMessageButton").click();
        await expect(page2.locator("#message").getByText("Hello from Admin1 again")).toBeVisible({ timeout: 20_000 });

        await page2.context().close();

        await page.context().close();
        await page3.context().close();
    });

    /**
     * Test for nested megaphone zones:
     * - A large "attendees" zone (listener) contains a smaller "podium" zone (speaker)
     * - When a user enters the attendees zone first, they become a listener
     * - When they then enter the podium zone (nested inside), they should switch to speaker role
     * - When they leave the podium zone but stay in the attendees zone, they should switch back to listener
     * - When they leave the attendees zone completely, they should disconnect from the space
     */
    test("Successfully handle nested speaker zone inside listener zone", async ({ browser, request }) => {
        await resetWamMaps(request);
        await using page = await getPage(browser, "Admin1", Map.url("empty"));

        // Open map editor and create zones
        await Menu.openMapEditor(page);
        await MapEditor.openAreaEditor(page);

        // Draw a smaller speaker zone (podium) INSIDE the listener zone
        // Zone covers from (3,6) to (7,8) in tile coordinates - completely inside the listener zone
        await AreaEditor.drawArea(page, { x: 3 * 32 * 1.5, y: 6 * 32 * 1.5 }, { x: 7 * 32 * 1.5, y: 8 * 32 * 1.5 });
        await AreaEditor.addProperty(page, "speakerMegaphone");
        await AreaEditor.setPodiumNameProperty(page, `${browser.browserType().name()}NestedPodium`);

        // Draw a large listener zone (attendees) - this will contain the speaker zone
        // Zone covers from (1,5) to (9,9) in tile coordinates
        await AreaEditor.drawArea(page, { x: 1 * 32 * 1.5, y: 5 * 32 * 1.5 }, { x: 9 * 32 * 1.5, y: 9 * 32 * 1.5 });
        await AreaEditor.addProperty(page, "listenerMegaphone");
        await AreaEditor.setMatchingPodiumZoneProperty(
            page,
            `${browser.browserType().name()}NestedPodium`.toLowerCase(),
        );

        await Menu.closeMapEditor(page);

        // Second browser - this will be the listener/speaker that tests nested zones
        await using page2 = await getPage(browser, "Bob", Map.url("empty"));

        // Step 1: Teleport page2 (Bob) to the listener zone (but outside the podium)
        // Position (2, 7) is inside the listener zone but outside the podium zone
        await Map.walkToPosition(page2, 2 * 32, 7 * 32);

        // Wait for the listener zone to be joined - camera container should appear
        await expect(page2.locator("#cameras-container")).toBeVisible({ timeout: 20_000 });

        // Now move page (Alice) to the speaker zone (podium)
        await Map.walkToPosition(page, 5 * 32, 7 * 32);

        // The speaker should be visible in their own container
        await expect(page.locator("#cameras-container").getByText("You")).toBeVisible({ timeout: 20_000 });

        // The listener (Bob) should see the speaker (Alice)
        await expect(page2.locator("#cameras-container").getByText("Admin1")).toBeVisible({ timeout: 20_000 });

        // Step 2: Move Bob INTO the podium zone (nested zone)
        // This should switch their role from listener to speaker WITHOUT leaving the space
        await Map.walkToPosition(page2, 5 * 32, 7 * 32);

        // Now both users should see each other as speakers
        await expect(page.locator("#cameras-container").getByText("Bob")).toBeVisible({ timeout: 20_000 });
        await expect(page2.locator("#cameras-container").getByText("Admin1")).toBeVisible({ timeout: 20_000 });

        // Step 3: Move Bob OUT of the podium zone but STILL IN the listener zone
        // This should switch their role back to listener WITHOUT leaving the space
        await Map.walkToPosition(page2, 2 * 32, 7 * 32);

        // Bob should still see the speaker
        await expect(page2.locator("#cameras-container").getByText("Admin1")).toBeVisible({ timeout: 20_000 });

        // The speaker should no longer see Bob (since Bob is now a listener again)
        await expect(page.locator("#cameras-container").getByText("Bob")).toBeHidden({ timeout: 20_000 });

        // Step 4: Move Bob completely OUT of both zones
        // This should leave the space completely
        await Map.walkToPosition(page2, 2 * 32, 2 * 32);

        // The cameras container should be hidden or show no remote streams
        // Wait for the listener to fully leave the space
        await expect(page2.locator("#cameras-container").getByText("Admin1")).toBeHidden({ timeout: 20_000 });

        await page2.context().close();
        await page.context().close();
    });
});
