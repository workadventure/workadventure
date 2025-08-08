import {expect, test} from '@playwright/test';
import {evaluateScript} from "./utils/scripting";
import {publicTestMapUrl} from "./utils/urls";
import Menu from "./utils/menu";
import { getPage } from "./utils/auth";
import {isMobile} from "./utils/isMobile";

test.describe('Areas', () => {
    test.beforeEach(async ({ page }) => {
        if (isMobile(page)) {
            //eslint-disable-next-line playwright/no-skipped-test
            test.skip();
            return;
        }
    });
    test('can edit Tiled area from scripting API', async ({ browser }) => {
        // This tests connects on a map with an area named "silent".
        // The Woka is out of the zone, but we move the zone to cover the Woka.
        // We check the silent zone applies to the Woka.

        const page = await getPage(browser, 'Alice',
            publicTestMapUrl("tests/Areas/AreaFromTiledMap/map.json", "areas")
        );

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

        await expect(page.getByText('Silent zone 🤐')).toBeVisible();
        await page.close();
        await page.context().close();
    });

    test('blocking audio areas', async ({ browser }) => {
        // Open audio test map
        const page = await getPage(browser, 'Alice',
            publicTestMapUrl("tests/E2E/audio.json", "areas")
        );
        // Verify audio area is working
        await evaluateScript(page, async () => {
            console.log('Waiting for WA.onInit()');
            await WA.onInit();
            console.log('Moving player to audio area');
            await WA.player.teleport(240, 144);
            return;
        });

        // Check that the manager sound is active
        await Menu.expectButtonState(page, "music-button", "active");
        // Click on the soud manager button
        await page.getByTestId('music-button').click();
        // Check that the slider is hidden
        await expect(page.getByRole('slider')).toBeHidden();
        // Click on the soud manager button
        await page.getByTestId('music-button').click();
        // Check that the slider is visible
        await expect(page.getByRole('slider')).toBeVisible();

        // Enable audio area blocking
        await Menu.openMenu(page);
        await page.getByRole('button', { name: 'All settings' }).click();
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
        await page.close();
        await page.context().close();
    });

    test('display warning on fail to load audio', async ({ browser }) => {
        // Open audio test map
        const page = await getPage(browser, 'Alice',
            publicTestMapUrl("tests/E2E/audio.json", "areas")
        );

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
        await page.close();
        await page.context().close();
    });
});
