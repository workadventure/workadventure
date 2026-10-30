import { expect, test } from "@playwright/test";
import Map from "../utils/map";
import AreaEditor from "../utils/map-editor/areaEditor";
import { resetWamMaps } from "../utils/map-editor/uploader";
import MapEditor from "../utils/mapeditor";
import Menu from "../utils/menu";
import { evaluateScript } from "../utils/scripting";
import { local_world, map_storage_url } from "../utils/urls";
import { getPage } from "../utils/auth";
import { dismissNoMicrophoneSoundToastWhenShown } from "../utils/noMicrophoneSoundToast";
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

    test("Successfully send message in meeting area @nofirefox", async ({ browser, request }) => {
        await resetWamMaps(request);
        await using page = await getPage(browser, "Admin1", Map.url("empty"));
        //await page.evaluate(() => { localStorage.setItem('debug', '*'); });
        //await page.reload();

        await Menu.openMapEditor(page);
        await MapEditor.openAreaEditor(page);
        // await expect(page.locator('canvas')).toBeVisible();
        await AreaEditor.drawArea(page, { x: 1 * 32, y: 2 * 32 }, { x: 9 * 32, y: 4 * 32 });
        await AreaEditor.addProperty(page, "livekitRoomProperty");
        await Menu.closeMapEditor(page);
        await Map.teleportToPosition(page, 4 * 32, 3 * 32);

        await using page2 = await getPage(browser, "Admin2", Map.url("empty"));

        await Map.teleportToPosition(page2, 4 * 32, 3 * 32);

        await expect(page.locator("#cameras-container").getByText("You")).toBeVisible({ timeout: 30_000 });
        await expect(page.locator("#cameras-container").getByText("Admin2")).toBeVisible({ timeout: 30_000 });

        //Test chat messages
        await page.getByTestId("chat-btn").click();
        await page.getByTestId("messageInput").fill("Hello from Admin1");
        await page.getByTestId("sendMessageButton").click();

        await expect(page2.locator("#message").getByText("Hello from Admin1")).toBeVisible({ timeout: 20_000 });

        await page2.getByTestId("messageInput").fill("Hello from Admin2");
        await page2.getByTestId("sendMessageButton").click();

        await expect(page.locator("#message").getByText("Hello from Admin2")).toBeVisible({ timeout: 20_000 });
    });

    test("Successfully reconnect to area if connection to space is lost @local @selfsigned @nofirefox", async ({
        browser,
        request,
    }) => {
        await resetWamMaps(request);
        await using page = await getPage(browser, "Admin1", Map.url("empty"));
        //await page.evaluate(() => { localStorage.setItem('debug', '*'); });
        //await page.reload();

        await Menu.openMapEditor(page);
        await MapEditor.openAreaEditor(page);
        // await expect(page.locator('canvas')).toBeVisible();
        await AreaEditor.drawArea(page, { x: 1 * 32, y: 2 * 32 }, { x: 9 * 32, y: 4 * 32 });
        await AreaEditor.addProperty(page, "livekitRoomProperty");
        await page.getByRole("textbox", { name: "Room Name", exact: true }).fill("foobar");
        await Menu.closeMapEditor(page);
        await Map.teleportToPosition(page, 4 * 32, 3 * 32);

        await using page2 = await getPage(browser, "Bob", Map.url("empty"));

        await Map.teleportToPosition(page2, 4 * 32, 3 * 32);

        await expect(page.locator("#cameras-container").getByText("You")).toBeVisible({ timeout: 30_000 });
        await expect(page.locator("#cameras-container").getByText("Bob")).toBeVisible({ timeout: 30_000 });

        // Delete space connection in the backend
        // This simulates a backend restart, as the space connection will be closed
        const result = await request.post(
            `http://api.workadventure.localhost/debug/close-space-connection?spaceName=${encodeURIComponent(`${local_world}.5w0szy-foobar`)}&token=123`,
        );
        expect(result.status()).toBe(200);

        // After a short disconnect, we should be reconnected and see the other user again
        // Extremely short wait to be sure the pusher has the time to send the disconnect event
        // eslint-disable-next-line playwright/no-wait-for-timeout
        await page.waitForTimeout(500);
        await expect(page.locator("#cameras-container").getByText("Bob")).toBeVisible();

        // Let's move out of the room and back again
        await Map.teleportToPosition(page2, 4 * 32, 8 * 32);

        await expect(page.locator("#cameras-container").getByText("Bob")).toBeHidden({ timeout: 30_000 });

        await Map.teleportToPosition(page2, 4 * 32, 3 * 32);

        // Do I see the user again?
        await expect(page.locator("#cameras-container").getByText("Bob")).toBeVisible({ timeout: 30_000 });
    });

    test("Successfully enter and leave space very quickly @nofirefox", async ({ browser, request }) => {
        // This test is testing the query abort mechanism when entering/leaving a space very quickly

        await resetWamMaps(request);
        await using page = await getPage(browser, "Admin1", Map.url("empty"));
        //await page.evaluate(() => { localStorage.setItem('debug', '*'); });
        //await page.reload();

        await Menu.openMapEditor(page);
        await MapEditor.openAreaEditor(page);
        // await expect(page.locator('canvas')).toBeVisible();
        await AreaEditor.drawArea(page, { x: 1 * 32, y: 2 * 32 }, { x: 9 * 32, y: 4 * 32 });
        await AreaEditor.addProperty(page, "livekitRoomProperty");
        await page.getByRole("textbox", { name: "Room Name", exact: true }).fill("foobar");
        await Menu.closeMapEditor(page);
        await Map.teleportToPosition(page, 4 * 32, 3 * 32);
        await Map.teleportToPosition(page, 0 * 32, 0 * 32);
        await Map.teleportToPosition(page, 4 * 32, 3 * 32);
        await Map.teleportToPosition(page, 0 * 32, 0 * 32);
        await Map.teleportToPosition(page, 4 * 32, 3 * 32);
        await Map.teleportToPosition(page, 0 * 32, 0 * 32);
        await Map.teleportToPosition(page, 4 * 32, 3 * 32);
        await Map.teleportToPosition(page, 0 * 32, 0 * 32);
        await Map.teleportToPosition(page, 4 * 32, 3 * 32);
        await Map.teleportToPosition(page, 0 * 32, 0 * 32);
        await evaluateScript(page, async () => {
            await WA.player.teleport(4 * 32, 3 * 32);
            await WA.player.teleport(0 * 32, 0 * 32);
            await WA.player.teleport(4 * 32, 3 * 32);
            await WA.player.teleport(0 * 32, 0 * 32);
            await WA.player.teleport(4 * 32, 3 * 32);
            await WA.player.teleport(0 * 32, 0 * 32);
            await WA.player.teleport(4 * 32, 3 * 32);
            await WA.player.teleport(0 * 32, 0 * 32);
            await WA.player.teleport(4 * 32, 3 * 32);
            await WA.player.teleport(0 * 32, 0 * 32);
            await WA.player.teleport(4 * 32, 3 * 32);
            await WA.player.teleport(0 * 32, 0 * 32);
            await WA.player.teleport(4 * 32, 3 * 32);
            await WA.player.teleport(0 * 32, 0 * 32);
        });

        // eslint-disable-next-line playwright/no-wait-for-timeout
        await page.waitForTimeout(1000); // Wait a bit to be sure that all aborts are processed

        // Move in back
        await Map.teleportToPosition(page, 4 * 32, 3 * 32);

        // Now let's see if Bob can see Admin1 properly
        await using page2 = await getPage(browser, "Bob", Map.url("empty"));

        await Map.teleportToPosition(page2, 4 * 32, 3 * 32);

        await expect(page.locator("#cameras-container").getByText("You")).toBeVisible({ timeout: 30_000 });
        await expect(page.locator("#cameras-container").getByText("Bob")).toBeVisible({ timeout: 30_000 });

        await expect(page2.locator("#cameras-container").getByText("You")).toBeVisible({ timeout: 30_000 });
        await expect(page2.locator("#cameras-container").getByText("Admin1")).toBeVisible({ timeout: 30_000 });
    });

    test("the moderator tag of a meeting room lets a member mute, mute everybody and remove people @nofirefox", async ({
        browser,
        request,
    }) => {
        await resetWamMaps(request);
        // The admin stays connected: the back keeps the room, edits included, instead of reloading the WAM
        // from the map storage, which may not have saved the moderator tag yet.
        await using admin = await getPage(browser, "Admin1", Map.url("empty"));
        await Menu.openMapEditor(admin);
        await MapEditor.openAreaEditor(admin);
        await AreaEditor.drawArea(admin, { x: 1 * 32, y: 2 * 32 }, { x: 9 * 32, y: 4 * 32 });
        await AreaEditor.addProperty(admin, "livekitRoomProperty");
        await admin.getByTestId("livekitRoomMoreOptionsButton").click();
        // Member1 logs in with the OpenID user that has the "member" tag.
        await admin.locator("#livekitRoomAdminTag").fill("member");
        await admin.getByTestId("livekitRoomConfigValidateButton").click();
        await Menu.closeMapEditor(admin);

        await using member = await getPage(browser, "Member1", Map.url("empty"));
        await Map.teleportToPosition(member, 4 * 32, 3 * 32);
        await using bob = await getPage(browser, "Bob", Map.url("empty"));
        await Map.teleportToPosition(bob, 4 * 32, 3 * 32);
        // The "no microphone sound" toast sits over the top right corner, where Bob's menu button is.
        await dismissNoMicrophoneSoundToastWhenShown(member);
        await dismissNoMicrophoneSoundToastWhenShown(bob);

        const bobBox = member.locator("#cameras-container .camera-box").filter({ hasText: "Bob" });
        await expect(bobBox).toBeVisible({ timeout: 30_000 });
        await expect(bob.locator("#cameras-container").getByText("Member1")).toBeVisible({ timeout: 30_000 });

        // Bob has no tag: he can only ask the moderator to mute.
        await bob
            .locator("#cameras-container .camera-box")
            .filter({ hasText: "Member1" })
            .locator(".user-menu-btn")
            .click();
        await expect(bob.getByRole("button", { name: "Ask to mute audio", exact: true })).toBeVisible();
        await expect(bob.getByRole("button", { name: "Mute audio for everybody", exact: true })).toBeHidden();
        await bob.keyboard.press("Escape");

        // The moderator mutes Bob for real: Bob is not asked.
        await bobBox.locator(".user-menu-btn").click();
        await member.getByRole("button", { name: "Mute audio", exact: true }).click();
        await expect(member.getByTestId("Bob is muted.")).toBeVisible({ timeout: 20_000 });
        await expect(bob.getByText("Can I mute your microphone?")).toBeHidden();

        // The moderator turns off everybody's camera.
        await bobBox.locator(".user-menu-btn").click();
        await member.getByRole("button", { name: "Turn off video for everybody", exact: true }).click();
        await expect(bob.getByText("Can I mute your camera?")).toBeVisible({ timeout: 20_000 });
        await expect(bobBox.locator("video")).toHaveCount(0, { timeout: 20_000 });

        // And removes him from the meeting.
        await bobBox.locator(".user-menu-btn").click();
        await member.getByRole("button", { name: "Moderation", exact: true }).click();
        await member.getByTestId("moderation-remove-action").click();
        await member.getByTestId("moderation-submit").click();
        await expect(bob.getByText("A moderator removed you from the conversation")).toBeVisible({
            timeout: 20_000,
        });
        await expect(bob.locator("#cameras-container").getByText("Member1")).toBeHidden({ timeout: 20_000 });
    });
});
