import { expect, test } from "@playwright/test";
import Map from "../utils/map.ts";
import AreaEditor from "../utils/map-editor/areaEditor.ts";
import { resetWamMaps } from "../utils/map-editor/uploader.ts";
import MapEditor from "../utils/mapeditor.ts";
import Menu from "../utils/menu.ts";
import { evaluateScript } from "../utils/scripting.ts";
import { map_storage_url } from "../utils/urls.ts";
import { getPage } from "../utils/auth.ts";
import { isMobile } from "../utils/isMobile.ts";

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

    test("Successfully set start area in the map editor", async ({ browser, request }) => {
        await resetWamMaps(request);
        await using page = await getPage(browser, "Admin1", Map.url("empty"));

        await Menu.openMapEditor(page);
        await MapEditor.openAreaEditor(page);
        await AreaEditor.drawArea(page, { x: 13 * 32, y: 0 }, { x: 15 * 32, y: 2 * 32 });
        await AreaEditor.setAreaName(page, "MyStartZone");
        await AreaEditor.addProperty(page, "startAreaProperty");
        await Menu.closeMapEditor(page);

        await page.context().close();
    });

    test("Successfully set and working exit area in the map editor", async ({ browser, request }) => {
        await resetWamMaps(request);
        await using page = await getPage(browser, "Admin1", Map.url("empty"));

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

        await Menu.openMenu(page);
        await expect(page.getByTestId("profile-menu")).toBeVisible();
        await expect(page.getByTestId("profile-menu").getByRole("button", { name: "Online" })).toBeVisible();

        await page.context().close();
    });
});
