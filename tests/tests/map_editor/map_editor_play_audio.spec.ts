import { fileURLToPath } from "url";
import type { Page } from "@playwright/test";
import { expect, test } from "@playwright/test";
import Map from "../utils/map";
import AreaEditor from "../utils/map-editor/areaEditor";
import EntityEditor from "../utils/map-editor/entityEditor";
import { resetWamMaps } from "../utils/map-editor/uploader";
import MapEditor from "../utils/mapeditor";
import Menu from "../utils/menu";
import { map_storage_url } from "../utils/urls";
import { getPage } from "../utils/auth";
import { isMobile } from "../utils/isMobile";

test.setTimeout(240_000);
test.use({
    baseURL: map_storage_url,
});

const UPLOADED_SOUND = /\/assets\/sounds\/test-sound-[0-9a-f-]+\.mp3$/;

async function uploadSound(page: Page) {
    const fileChooserPromise = page.waitForEvent("filechooser");
    await page.locator(".map-editor .sidebar .properties-container span#chooseUpload").click();
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles(fileURLToPath(new URL("../assets/test-sound.mp3", import.meta.url)));
    await expect(page.locator(".map-editor .sidebar .properties-container").getByText("test-sound.mp3")).toBeVisible();
}

/**
 * The sound the audio player plays, once the browser could read it. The preview player of the map
 * editor shares the class but has no src until its play button is used.
 */
async function playedSound(page: Page): Promise<string> {
    const player = page.locator(".audio-manager-audioplayer[src]");
    await expect
        .poll(() => player.evaluate((audio: HTMLAudioElement) => audio.error === null && audio.readyState > 0))
        .toBe(true);
    return (await player.getAttribute("src")) ?? "";
}

test.describe("Map editor play audio @oidc @nomobile", () => {
    test.beforeEach(
        "Ignore tests on mobilechromium because map editor not available for mobile devices",
        ({ page }) => {
            // Map Editor not available on mobile
            test.skip(isMobile(page), "Map editor is not available on mobile");
        },
    );

    // https://github.com/element-hq/synapse/issues/19303 - skip webkit due to synapse v1.144.0 OIDC issues
    test("Play an uploaded sound from an entity and an area @nowebkit", async ({ browser, request, browserName }) => {
        // Skip the test on Webkit because the click up doesn't work
        test.skip(browserName === "webkit", "WebKit click up does not work here");

        await resetWamMaps(request);
        await using page = await getPage(browser, "Admin1", Map.url("empty"));

        // Entity with an uploaded sound
        await Menu.openMapEditor(page);
        await MapEditor.openEntityEditor(page);
        await EntityEditor.selectEntity(page, 0, "coffee");
        await EntityEditor.moveAndClick(page, 1 * 32, 7.5 * 32);
        await EntityEditor.clearEntitySelection(page);
        await EntityEditor.moveAndClick(page, 1 * 32, 7.5 * 32);
        await EntityEditor.addProperty(page, "playAudio");
        await uploadSound(page);
        await Menu.closeMapEditor(page);

        await EntityEditor.walkToFacingDown(page, 1 * 32, 7.5 * 32 - 30);
        await expect(page.getByText("SPACE to interact with it 👀")).toBeVisible({ timeout: 30000 });
        await page.keyboard.press("Space");

        const entitySoundUrl = await playedSound(page);
        expect(entitySoundUrl).toMatch(UPLOADED_SOUND);
        // Sounds are public map assets: no token needed, unlike "open file" documents.
        expect((await request.get(entitySoundUrl)).ok()).toBe(true);

        // Area with an uploaded sound, played on enter
        await Menu.openMapEditor(page);
        await MapEditor.openAreaEditor(page);
        await AreaEditor.drawArea(page, { x: 4 * 32, y: 4 * 32 }, { x: 6 * 32, y: 6 * 32 });
        await AreaEditor.addProperty(page, "playAudio");
        await uploadSound(page);
        await Map.teleportToPosition(page, 5 * 32, 5 * 32);

        const areaSoundUrl = await playedSound(page);
        expect(areaSoundUrl).toMatch(UPLOADED_SOUND);
        expect(areaSoundUrl).not.toBe(entitySoundUrl);

        // Switching the area to a URL plays that URL and deletes the file it no longer uses
        await page.getByText("Use a URL", { exact: true }).click();
        const audioLink = page.locator(".map-editor .sidebar .properties-container input#audioLink");
        await audioLink.fill(entitySoundUrl);
        await audioLink.press("Enter");

        await expect.poll(() => playedSound(page)).toBe(entitySoundUrl);
        await expect.poll(async () => (await request.get(areaSoundUrl)).ok()).toBe(false);

        // Deleting the entity deletes its sound
        await Menu.closeMapEditor(page);
        await page.keyboard.press("e");
        await EntityEditor.moveAndClick(page, 1 * 32, 7.5 * 32);
        await page.keyboard.press("Delete");

        await expect.poll(async () => (await request.get(entitySoundUrl)).ok()).toBe(false);
    });
});
