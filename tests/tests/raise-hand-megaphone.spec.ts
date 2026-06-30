import { expect, test } from "@playwright/test";
import Map from "./utils/map";
import AreaEditor from "./utils/map-editor/areaEditor";
import { resetWamMaps } from "./utils/map-editor/uploader";
import MapEditor from "./utils/mapeditor";
import Menu from "./utils/menu";
import { map_storage_url } from "./utils/urls";
import { getPage } from "./utils/auth";
import { isMobile } from "./utils/isMobile";

test.setTimeout(240_000); // Map editor + LiveKit promotion can be slow, especially on WebKit.
test.use({
    baseURL: map_storage_url,
});

// This test covers the webinar gap that the proximity raise-hand test cannot: a megaphone speaker whose podium
// has "See attendees" OFF does not receive listeners' SpaceUser, so the listener has no video tile for the
// speaker. The raised-hands queue travels through the space metadata (broadcast to every member regardless of
// the visibility filter), so the speaker still sees the queue in the host panel and can give the floor — which
// promotes the listener to speaker via a private event.
test.describe("Raise hand in megaphone @oidc @nomobile @nowebkit", () => {
    test.beforeEach(({ browserName, page }) => {
        // Map editor is unavailable on mobile, and WebKit has camera/microphone issues in CI.
        test.skip(browserName === "webkit" || isMobile(page), "Map editor unavailable on mobile; WebKit camera issues");
    });

    test("a speaker without See attendees sees raised hands in the panel and gives the floor @nofirefox", async ({
        browser,
        request,
    }) => {
        // Promotion relies on a WebRTC/LiveKit connection that is sometimes flaky on Firefox.
        test.skip(browser.browserType().name() === "firefox", "WebRTC promotion is sometimes flaky on Firefox");

        await resetWamMaps(request);

        const podiumName = `${browser.browserType().name()}RaiseHandPodium`;

        // Admin1 creates a podium (speaker) zone with "See attendees" OFF, linked to a listener zone.
        await using speaker = await getPage(browser, "Admin1", Map.url("empty"));
        await Menu.openMapEditor(speaker);
        await MapEditor.openAreaEditor(speaker);
        await AreaEditor.drawArea(speaker, { x: 1 * 32, y: 2 * 32 }, { x: 9 * 32, y: 4 * 32 });
        await AreaEditor.addProperty(speaker, "speakerMegaphone");
        await AreaEditor.setPodiumNameProperty(speaker, podiumName, false, false);
        await AreaEditor.drawArea(speaker, { x: 1 * 32, y: 6 * 32 }, { x: 9 * 32, y: 9 * 32 });
        await AreaEditor.addProperty(speaker, "listenerMegaphone");
        await AreaEditor.setMatchingPodiumZoneProperty(speaker, podiumName.toLowerCase());
        await Menu.closeMapEditor(speaker);

        // Admin1 steps onto the podium and becomes the speaker.
        await Map.teleportToPosition(speaker, 4 * 32, 3 * 32);
        await expect(speaker.locator("#cameras-container").getByText("You")).toBeVisible({ timeout: 20_000 });

        // No raised hand yet -> the speaker has no "raised hands" panel button.
        await expect(speaker.getByTestId("raised-hands-panel-button")).toBeHidden();

        // Bob joins the listener zone. With "See attendees" OFF, the speaker does not see Bob's tile.
        await using bob = await getPage(browser, "Bob", Map.url("empty"));
        await Map.teleportToPosition(bob, 4 * 32, 7 * 32);
        await expect(bob.locator("#cameras-container").getByText("Admin1")).toBeVisible({ timeout: 20_000 });
        await expect(speaker.locator("#cameras-container").getByText("Bob", { exact: true })).toBeHidden({
            timeout: 10_000,
        });

        // Bob raises his hand. The metadata queue reaches the speaker despite "See attendees" being OFF.
        await bob.getByTestId("raise-hand-button").click();

        // The speaker's panel button appears; opening it lists Bob.
        await expect(speaker.getByTestId("raised-hands-panel-button")).toBeVisible({ timeout: 20_000 });
        await speaker.getByTestId("raised-hands-panel-button").click();
        await expect(speaker.getByTestId("raised-hands-panel").getByText("Bob")).toBeVisible({ timeout: 10_000 });

        // The speaker gives Bob the floor from the panel.
        await speaker.getByTestId("panel-give-floor").first().click();

        // Bob is told it is his turn, and the promotion makes his camera visible to the speaker.
        await expect(bob.getByText(/It's your turn to speak/)).toBeVisible({ timeout: 20_000 });
        await expect(speaker.locator("#cameras-container").getByText("Bob", { exact: true })).toBeVisible({
            timeout: 30_000,
        });
    });
});
