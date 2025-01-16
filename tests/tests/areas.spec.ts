
import {} from "../../play/packages/iframe-api-typings/iframe_api";
import {expect, test} from '@playwright/test';
import { login } from './utils/roles';
import {evaluateScript} from "./utils/scripting";
import {publicTestMapUrl} from "./utils/urls";
import Menu from "./utils/menu";

test.describe('Areas', () => {
    test('can edit Tiled area from scripting API', async ({ page }, { project }) => {
        // Skip test for mobile device
        if(project.name === "mobilechromium") {
            //eslint-disable-next-line playwright/no-skipped-test
            test.skip();
            return;
        }

        // This tests connects on a map with an area named "silent".
        // The Woka is out of the zone, but we move the zone to cover the Woka.
        // We check the silent zone applies to the Woka.

        await page.goto(
            publicTestMapUrl("tests/Areas/AreaFromTiledMap/map.json", "areas")
        );
        await login(page, 'Alice', 2, 'en-US');

        await evaluateScript(page, async () => {
            await WA.onInit();

            const silentArea = await WA.room.area.get('silent');
            // Let's move the silent area to cover the map
            silentArea.x = 0;
            silentArea.y = 0;
            silentArea.width = 800;
            silentArea.height = 600;
            return;
        });
        await expect(page.getByText('You\'re in a silent zone')).toBeVisible();
    });

    test('blocking audio areas', async ({ page, browser }, { project }) => {
        if(project.name === "mobilechromium") {
            //eslint-disable-next-line playwright/no-skipped-test
            test.skip();
            return;
        }

        // Open audio test map
        await page.goto(publicTestMapUrl("tests/E2E/audio.json", "areas"));
        await login(page);

        // Verify audio area is working
        await evaluateScript(page, async () => {
            console.log('Waiting for WA.onInit()');
            await WA.onInit();
            console.log('Moving player to audio area');
            await WA.player.teleport(240, 144);
            return;
        });
        await Menu.expectButtonState(page, "music-button", "normal");
        await page.getByTestId('music-button').click();
        await expect(page.getByRole('slider')).toBeVisible();
        await page.getByTestId('music-button').click();
        await expect(page.getByRole('slider')).toBeHidden();

        // Enable audio area blocking
        await Menu.openMenu(page);
        await page.getByRole('button', { name: 'Other settings' }).click();
        await page.getByText('Block ambient sounds and music').click();
        await page.locator('#closeMenu').click();

        // Verify audio area is working
        await evaluateScript(page, async () => {
            console.log('Waiting for WA.onInit()');
            await WA.onInit();
            console.log('Moving player to audio area');
            await WA.player.teleport(176, 144);
            await WA.player.teleport(240, 144);
            return;
        });
        await Menu.expectButtonState(page, "music-button", "disabled");
    });

    test('display warning on fail to load audio', async ({ page, browser }, { project }) => {
        if(project.name === "mobilechromium") {
            //eslint-disable-next-line playwright/no-skipped-test
            test.skip();
            return;
        }

        // Open audio test map
        await page.goto(publicTestMapUrl("tests/E2E/audio.json", "areas"));
        await login(page);

        // Verify audio area is working
        await evaluateScript(page, async () => {
            console.log('Waiting for WA.onInit()');
            await WA.onInit();
            const silentArea = await WA.room.area.get('audioArea');
            silentArea.setProperty('playAudio', 'invalid.mp3');
            console.log('Moving player to audio area');
            await WA.player.teleport(240, 144);
            return;
        });
        await Menu.expectButtonState(page, "music-button", "forbidden");
        await expect(page.getByText('Could not load sound')).toBeVisible();
    });
});
