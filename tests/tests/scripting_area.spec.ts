import { expect, test } from "@playwright/test";
import { evaluateScript } from "./utils/scripting";
import Map from "./utils/map";
import { uploadEmptyMap } from "./utils/map-editor/uploader";
import menu from "./utils/menu";
import mapeditor from "./utils/mapeditor";
import areaEditor from "./utils/map-editor/areaEditor";
import { getPage } from "./utils/auth";
import { isMobile } from "./utils/isMobile";

const mapUrl = Map.url("scriptingArea");

test.describe("Scripting for Map editor @oidc @nomobile @nowebkit", () => {
    test.beforeEach(
        "Ignore tests on mobilechromium because map editor not available for mobile devices",
        ({ page }) => {
            // Map Editor not available on mobile
            test.skip(isMobile(page), "Map editor is not available on mobile");
        },
    );
    test.beforeEach("Ignore tests on webkit because of issue with camera and microphone", ({ browserName }) => {
        // WebKit has issue with camera
        test.skip(browserName === "webkit", "WebKit has issues with camera/microphone");
    });
    test("Scripting Area onEnter & onLeave", async ({ browser, request }) => {
        await uploadEmptyMap(request, "scriptingArea");
        await using page = await getPage(browser, "Admin1", mapUrl);
        await menu.openMapEditor(page);
        await mapeditor.openAreaEditor(page);
        await areaEditor.drawArea(page, { x: 0, y: 7 * 32 * 1.5 }, { x: 5 * 32 * 1.5, y: 9 * 32 * 1.5 });
        await areaEditor.setAreaName(page, "MyZone");

        await evaluateScript(page, () => {
            WA.mapEditor.area.onEnter("MyZone").subscribe(() => {
                WA.ui.displayActionMessage({
                    message: "Welcome to MyZone",
                    type: "message",
                    callback: () => {
                        console.info("Welcome to MyZone");
                    },
                });
            });

            WA.mapEditor.area.onLeave("MyZone").subscribe(() => {
                WA.ui.displayActionMessage({
                    message: "Goodbye to MyZone",
                    type: "message",
                    callback: () => {
                        console.info("Goodbye to MyZone");
                    },
                });
            });
        });

        await menu.closeMapEditor(page);
        await Map.teleportToPosition(page, 2 * 32, 8 * 32);
        await expect(page.getByText("Welcome to MyZone")).toBeVisible();
        await page.getByRole("button", { name: "Close" }).first().click();
        await Map.teleportToPosition(page, 9 * 32, 9 * 32);
        await expect(page.getByText("Goodbye to MyZone")).toBeVisible();
        await page.getByRole("button", { name: "Close" }).click();
        await expect(page.locator("span.characterTriggerAction")).toBeHidden();

        await page.context().close();
    });
});
