/// <reference types="@workadventure/iframe-api-typings/iframe_api" />

import {expect, test} from '@playwright/test';
import Menu from "./utils/menu";
import {hideNoCamera, login} from "./utils/roles";
import MapEditor from "./utils/mapeditor";
import AreaEditor from "./utils/map-editor/areaEditor";
import Map from "./utils/map";
import {resetWamMaps} from "./utils/map-editor/uploader";
import {evaluateScript} from "./utils/scripting";

test.describe('Scripting chat functions', () => {
    test('can catch event to enter and to leave one area created by the map editor ', async ({ page, browser, request, browserName }, { project }) => {
        // Skip test for mobile device because the map editor is not available
        if(project.name === "mobilechromium") {
            //eslint-disable-next-line playwright/no-skipped-test
            test.skip();
            return;
        }

        await resetWamMaps(request);
        await page.goto(Map.url("empty"));
        await login(page, "Bob", 3);
        if(browserName === "webkit"){
          // Because webkit in playwright does not support Camera/Microphone Permission by settings
          await hideNoCamera(page);
        }
    
        await Menu.openMapEditor(page);
        await MapEditor.openAreaEditor(page);
        await AreaEditor.drawArea(page, {x: 13*32, y: 13*32}, {x: 15*32, y: 15*32});
        await AreaEditor.setAreaName(page, 'MyStartZone');
        await Menu.closeMapEditor(page);

        // Move the player to the area
        await evaluateScript(page, async () => {
            await WA.onInit();
            let triggerMessage;
            WA.room.area.onEnter('MyStartZone').subscribe(() => {
                triggerMessage = WA.ui.displayActionMessage({
                    message: "Entered the area name: MyStartZone",
                    callback: () => {
                        console.info("Message clicked");
                    }
                });
            });

            WA.room.area.onLeave('MyStartZone').subscribe(() => {
                triggerMessage?.remove();
            });
        });

        // Move the player to the area
        await Map.teleportToPosition(page, 9 * 32, 9 * 32)

        // Check that the player has been notified
        await expect(page.getByText("Entered the area name: MyStartZone")).toBeVisible({timeout: 5000});

        // Move the player out of the area
        await Map.teleportToPosition(page, 0 * 32, 9 * 32)

        // Check that the notification has been removed
        await expect(page.getByText("Entered the area name: MyStartZone")).toBeHidden({timeout: 5000});
    });
});
