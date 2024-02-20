
import {} from "../../play/packages/iframe-api-typings/iframe_api";
import {expect, test} from '@playwright/test';
import { login } from './utils/roles';
import {evaluateScript} from "./utils/scripting";
import {publicTestMapUrl} from "./utils/urls";

test.describe('Areas', () => {
    test('can edit Tiled area from scripting API', async ({ page, browser }) => {

        // This tests connects on a map with an area named "silent".
        // The Woka is out of the zone, but we move the zone to cover the Woka.
        // We check the silent zone applies to the Woka.

        await page.goto(
            publicTestMapUrl("tests/Areas/AreaFromTiledMap/map.json", "areas")
        );
        await login(page, 'Alice');

        await evaluateScript(page, async () => {
            console.log('Waiting for WA.onInit()');
            await WA.onInit();

            console.log('Getting the area');
            const silentArea = await WA.room.area.get('silent');
            // Let's move the silent area to cover the map
            silentArea.x = 0;
            silentArea.y = 0;
            silentArea.width = 800;
            silentArea.height = 600;
            return;
        });

        await expect(page.getByText('Silent zone')).toBeVisible();
    });

});
