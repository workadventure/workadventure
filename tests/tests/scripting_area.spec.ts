import { expect, test } from "@playwright/test";
import { evaluateScript } from "./utils/scripting";
import { login } from "./utils/roles";
import Map from "./utils/map";
import { resetWamMaps } from "./utils/map-editor/uploader";
import { oidcAdminTagLogin } from "./utils/oidc";
import menu from "./utils/menu";
import mapeditor from "./utils/mapeditor";
import areaEditor from "./utils/map-editor/areaEditor";

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


    test("Scripting Area onEnter & onLeave", async ({page, request}, {project}) => {
        await resetWamMaps(request);
        await page.goto(Map.url("start"));
        await login(page, "test", 3, "en-US");
        await oidcAdminTagLogin(page, false);

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
                    message: "Goodby to MyZone",
                    type: "message",
                    callback: () => {
                        console.info("Goodby to MyZone");
                    }
                });
            });
        });

        await menu.closeMapEditor(page);
        await Map.teleportToPosition(page, 9 * 32, 3 * 32);
        await expect(page.getByText('Welcome to MyZone')).toBeVisible();
        await page.getByRole('button', { name: 'Close' }).click();

        await Map.teleportToPosition(page, 9 * 32, 9 * 32);
        await expect(page.getByText('Goodby to MyZone')).toBeVisible();
        await page.getByRole('button', { name: 'Close' }).click();

        await expect(page.getByRole('button', { name: 'Close'})).toBeHidden();
    });
});