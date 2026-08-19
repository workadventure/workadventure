import type { Page } from "@playwright/test";
import { expect, test } from "@playwright/test";
import Map from "./utils/map";
import AreaEditor from "./utils/map-editor/areaEditor";
import ConfigureMyRoom from "./utils/map-editor/configureMyRoom";
import Megaphone from "./utils/map-editor/megaphone";
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

// AreaEditor.drawArea drags on the Phaser canvas, and the drag occasionally does not register: the canvas is
// still settling right after drawArea toggles the camera preview off and back on for an area near the top of
// the screen. No area then gets created or selected, the property list never appears, and the following
// addProperty times out on its test id. The same race fails map_editor_megaphone_speaker_zone.spec.ts on
// master, so draw again instead of inheriting the flake.
async function drawAreaWithProperties(
    page: Page,
    topLeft: { x: number; y: number },
    bottomRight: { x: number; y: number },
): Promise<void> {
    await AreaEditor.drawArea(page, topLeft, bottomRight);
    // A property button only exists while an area is selected, so it tells us the drag landed.
    if (await page.getByTestId("speakerMegaphone").isVisible()) {
        return;
    }
    await AreaEditor.drawArea(page, topLeft, bottomRight);
    await expect(page.getByTestId("speakerMegaphone")).toBeVisible();
}

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
        await drawAreaWithProperties(speaker, { x: 1 * 32, y: 2 * 32 }, { x: 9 * 32, y: 4 * 32 });
        await AreaEditor.addProperty(speaker, "speakerMegaphone");
        await AreaEditor.setPodiumNameProperty(speaker, podiumName, false, false);
        await drawAreaWithProperties(speaker, { x: 1 * 32, y: 6 * 32 }, { x: 9 * 32, y: 9 * 32 });
        await AreaEditor.addProperty(speaker, "listenerMegaphone");
        await AreaEditor.setMatchingPodiumZoneProperty(speaker, podiumName.toLowerCase());
        await Menu.closeMapEditor(speaker);

        // Admin1 steps onto the podium and becomes the speaker.
        await Map.teleportToPosition(speaker, 4 * 32, 3 * 32);
        await expect(speaker.locator("#cameras-container").getByText("You")).toBeVisible({ timeout: 20_000 });

        // No raised hand yet -> the host's docked raised-hands panel is not shown.
        await expect(speaker.getByTestId("raised-hands-dock")).toBeHidden();

        // Bob joins the listener zone. With "See attendees" OFF, the speaker does not see Bob's tile.
        await using bob = await getPage(browser, "Bob", Map.url("empty"));
        await Map.teleportToPosition(bob, 4 * 32, 7 * 32);
        await expect(bob.locator("#cameras-container").getByText("Admin1")).toBeVisible({ timeout: 20_000 });
        await expect(speaker.locator("#cameras-container").getByText("Bob", { exact: true })).toBeHidden({
            timeout: 10_000,
        });

        // Bob raises his hand. The metadata queue reaches the speaker despite "See attendees" being OFF.
        await bob.getByTestId("raise-hand-button").click();

        // The host's docked raised-hands panel appears (expanded) and lists Bob.
        await expect(speaker.getByTestId("raised-hands-dock")).toBeVisible({ timeout: 20_000 });
        await expect(speaker.getByTestId("raised-hands-panel").getByText("Bob")).toBeVisible({ timeout: 10_000 });

        // The speaker gives Bob the floor from the panel.
        await speaker.getByTestId("panel-give-floor").first().click();

        // Bob is told it is his turn, and the promotion makes his camera visible to the speaker.
        await expect(bob.getByText(/It's your turn to speak/)).toBeVisible({ timeout: 20_000 });
        await expect(speaker.locator("#cameras-container").getByText("Bob", { exact: true })).toBeVisible({
            timeout: 30_000,
        });

        // Bob is on stage: his raise-hand button stays visible as the single control (there is never a separate
        // give-back button). Clicking it now hands the floor back.
        await expect(bob.getByTestId("raise-hand-button")).toBeVisible({ timeout: 20_000 });
        await bob.getByTestId("raise-hand-button").click();

        // Bob is demoted, so the speaker no longer sees his camera.
        await expect(speaker.locator("#cameras-container").getByText("Bob", { exact: true })).toBeHidden({
            timeout: 30_000,
        });

        // Being a listener again, Bob still has the raise-hand button and can raise his hand once more.
        await expect(bob.getByTestId("raise-hand-button")).toBeVisible({ timeout: 20_000 });
    });

    test("the host takes the floor back from the management panel @nofirefox", async ({ browser, request }) => {
        test.skip(browser.browserType().name() === "firefox", "WebRTC promotion is sometimes flaky on Firefox");

        await resetWamMaps(request);

        const podiumName = `${browser.browserType().name()}RaiseHandRevokePodium`;

        await using speaker = await getPage(browser, "Admin1", Map.url("empty"));
        await Menu.openMapEditor(speaker);
        await MapEditor.openAreaEditor(speaker);
        await drawAreaWithProperties(speaker, { x: 1 * 32, y: 2 * 32 }, { x: 9 * 32, y: 4 * 32 });
        await AreaEditor.addProperty(speaker, "speakerMegaphone");
        await AreaEditor.setPodiumNameProperty(speaker, podiumName, false, false);
        await drawAreaWithProperties(speaker, { x: 1 * 32, y: 6 * 32 }, { x: 9 * 32, y: 9 * 32 });
        await AreaEditor.addProperty(speaker, "listenerMegaphone");
        await AreaEditor.setMatchingPodiumZoneProperty(speaker, podiumName.toLowerCase());
        await Menu.closeMapEditor(speaker);

        await Map.teleportToPosition(speaker, 4 * 32, 3 * 32);
        await expect(speaker.locator("#cameras-container").getByText("You")).toBeVisible({ timeout: 20_000 });

        await using bob = await getPage(browser, "Bob", Map.url("empty"));
        await Map.teleportToPosition(bob, 4 * 32, 7 * 32);
        await expect(bob.locator("#cameras-container").getByText("Admin1")).toBeVisible({ timeout: 20_000 });

        // Bob raises his hand and the host gives him the floor from the docked panel.
        await bob.getByTestId("raise-hand-button").click();
        await expect(speaker.getByTestId("raised-hands-dock")).toBeVisible({ timeout: 20_000 });
        await speaker.getByTestId("panel-give-floor").first().click();
        await expect(speaker.locator("#cameras-container").getByText("Bob", { exact: true })).toBeVisible({
            timeout: 30_000,
        });

        // The docked panel stays visible even though the raised-hands queue is now empty (Bob is speaking); take
        // the floor back from the "Speaking" section.
        await expect(speaker.getByTestId("raised-hands-dock")).toBeVisible({ timeout: 20_000 });
        await expect(speaker.getByTestId("panel-revoke-floor")).toBeVisible({ timeout: 20_000 });
        await speaker.getByTestId("panel-revoke-floor").first().click();

        // Bob is told he no longer has the floor and is demoted (his camera disappears for the host).
        await expect(bob.getByText(/no longer have the floor/i)).toBeVisible({ timeout: 20_000 });
        await expect(speaker.locator("#cameras-container").getByText("Bob", { exact: true })).toBeHidden({
            timeout: 30_000,
        });
    });

    // Regression test for the reported bug: a listener given the floor in the GLOBAL (room-level) megaphone —
    // which is not tracked by the map's speaker/listener zones — then walks into a map speaker zone (a different
    // space) and back out. The zone-leave logic only tears down zone spaces, so without the fix the global
    // megaphone stream is never stopped and the user stays "in the space" as a stranded speaker.
    test("a listener given the floor in the global megaphone is not stranded after visiting a map speaker zone @nofirefox", async ({
        browser,
        request,
    }) => {
        test.skip(browser.browserType().name() === "firefox", "WebRTC promotion is sometimes flaky on Firefox");

        await resetWamMaps(request);

        await using speaker = await getPage(browser, "Admin1", Map.url("empty"));
        await Map.teleportToPosition(speaker, 5 * 32, 5 * 32);

        // Configure the room-level (global) megaphone, then remove the tag restriction so everyone can use it.
        // Both saves happen in a single "Configure my room" session: closing the popup leaves the map editor
        // open, so reopening it would toggle the editor *off* and the next click would race its exit animation.
        await Menu.openMapEditor(speaker);
        await MapEditor.openConfigureMyRoom(speaker);
        await ConfigureMyRoom.selectMegaphoneItemInCMR(speaker);
        await Megaphone.toggleMegaphone(speaker);
        await Megaphone.megaphoneInputNameSpace(speaker, `${browser.browserType().name()}RaiseHandGlobal`);
        await Megaphone.megaphoneSelectScope(speaker);
        await Megaphone.megaphoneAddNewRights(speaker, "example");
        await Megaphone.megaphoneSave(speaker);
        await Megaphone.isCorrectlySaved(speaker);
        // The save button stays disabled on "Megaphone settings saved" for 3.5s; wait for it to go back to
        // "Save" before saving again.
        await expect(speaker.getByRole("button", { name: "Megaphone settings saved" })).toBeHidden();

        await Megaphone.megaphoneRemoveRights(speaker, "example");
        await Megaphone.megaphoneSave(speaker);
        await Megaphone.isCorrectlySaved(speaker);
        await Menu.closeMapEditorConfigureMyRoomPopUp(speaker);

        // Add a SEPARATE map speaker zone (a different space than the global megaphone). The map editor is
        // still open here, so we go straight to the area editor.
        await MapEditor.openAreaEditor(speaker);
        await drawAreaWithProperties(speaker, { x: 1 * 32, y: 1 * 32 }, { x: 4 * 32, y: 3 * 32 });
        await AreaEditor.addProperty(speaker, "speakerMegaphone");
        await AreaEditor.setPodiumNameProperty(
            speaker,
            `${browser.browserType().name()}RaiseHandGlobalZone`,
            false,
            false,
        );
        await Menu.closeMapEditor(speaker);

        // Admin1 starts the global megaphone -> becomes the global speaker.
        await Menu.isThereMegaphoneButton(speaker);
        await Menu.clickSendGlobalMessage(speaker);
        await expect(speaker.getByRole("button", { name: "Start live message" })).toBeVisible();
        await speaker.getByRole("button", { name: "Start live message" }).click({ timeout: 10_000 });
        await expect(speaker.getByRole("button", { name: "Start megaphone" })).toBeVisible();
        await speaker.getByRole("button", { name: "Start megaphone" }).click({ timeout: 10_000 });
        await speaker.locator(".close-btn").first().click();

        // Bob joins away from the speaker zone and receives the global megaphone (sees Admin1).
        await using bob = await getPage(browser, "Bob", Map.url("empty"));
        await Map.teleportToPosition(bob, 12 * 32, 12 * 32);
        await expect(bob.locator("#cameras-container").getByText("Admin1")).toBeVisible({ timeout: 30_000 });

        // Bob raises his hand; Admin1 gives him the floor from the docked panel.
        await bob.getByTestId("raise-hand-button").click();
        await expect(speaker.getByTestId("raised-hands-dock")).toBeVisible({ timeout: 20_000 });
        await speaker.getByTestId("panel-give-floor").first().click();

        // Bob is promoted: the global speaker now sees Bob's camera.
        await expect(speaker.locator("#cameras-container").getByText("Bob", { exact: true })).toBeVisible({
            timeout: 30_000,
        });

        // Bob walks INTO the map speaker zone, then back OUT.
        await Map.teleportToPosition(bob, 2 * 32, 2 * 32);
        await Map.teleportToPosition(bob, 12 * 32, 12 * 32);

        // Bob must be demoted back to a listener: the global speaker no longer sees his camera. Without the fix
        // Bob stays streaming in the global megaphone and remains visible — stranded "in the space".
        await expect(speaker.locator("#cameras-container").getByText("Bob", { exact: true })).toBeHidden({
            timeout: 30_000,
        });
    });
});
