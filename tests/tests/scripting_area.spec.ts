import { expect, test } from "@playwright/test";
import { evaluateScript } from "./utils/scripting";
import Map from "./utils/map";
import { resetWamMaps } from "./utils/map-editor/uploader";
import menu from "./utils/menu";
import mapeditor from "./utils/mapeditor";
import areaEditor from "./utils/map-editor/areaEditor";
import {getPage} from "./utils/auth"

test.describe("Scripting for Map editor @oidc", () => {
    test.beforeEach(
        "Ignore tests on mobilechromium because map editor not available for mobile devices",
        ({}, {project}) => {
            //Map Editor not available on mobile
            if (project.name === "mobilechromium") {
                //eslint-disable-next-line playwright/no-skipped-test
                test.skip();
                return;
            }
        }
    );

    test.beforeEach("Ignore tests on webkit because of issue with camera and microphone", ({browserName}) => {
        //WebKit has issue with camera
        if (browserName === "webkit") {
            //eslint-disable-next-line playwright/no-skipped-test
            test.skip();
            return;
        }
    });


    test("Scripting Area onEnter & onLeave", async ({browser, request}) => {
        await resetWamMaps(request);
        const page = await getPage(browser, 'Admin1', Map.url("empty"));

        await menu.openMapEditor(page);
        await mapeditor.openAreaEditor(page);
        await areaEditor.drawArea(page, {x: 6 * 32, y: 0}, {x: 20 * 32, y: 6 * 32});
        await areaEditor.setAreaName(page, "MyZone");

        await evaluateScript(page, () => {
            WA.mapEditor.area.onEnter("MyZone").subscribe(() => {
                WA.ui.displayActionMessage({
                    message: "Welcome to MyZone",
                    type: "message",
                    callback: () => {
                        console.info("Welcome to MyZone");
                    }
                });
            });

            WA.mapEditor.area.onLeave("MyZone").subscribe(() => {
                WA.ui.displayActionMessage({
                    message: "Goodbye to MyZone",
                    type: "message",
                    callback: () => {
                        console.info("Goodbye to MyZone");
                    }
                });
            });
        });

        await menu.closeMapEditor(page);
        await Map.teleportToPosition(page, 9 * 32, 3 * 32);
        await expect(page.getByText('Welcome to MyZone')).toBeVisible();
        await page.getByRole('button', { name: 'Close' }).first().click();
        await Map.teleportToPosition(page, 9 * 32, 9 * 32);
        await expect(page.getByText('Goodbye to MyZone')).toBeVisible();
        await page.getByRole('button', { name: 'Close' }).click();
        await expect(page.locator('span.characterTriggerAction')).toBeHidden();

        await page.close();
        await page.context().close();
    });
});