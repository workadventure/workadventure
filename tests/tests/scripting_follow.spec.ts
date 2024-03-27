import {expect, test, webkit} from '@playwright/test';
import { login } from './utils/roles';
import {evaluateScript} from "./utils/scripting";
import Map from './utils/map';
import {publicTestMapUrl} from "./utils/urls";

test.describe('Scripting follow functions', () => {
    test('can trigger follow from script', async ({ page, browser}, { project }) => {
        // It seems WebRTC fails to start on Webkit
        if(browser.browserType() === webkit) {
            //eslint-disable-next-line playwright/no-skipped-test
            test.skip();
            return;
        }

        await page.goto(
            publicTestMapUrl("tests/E2E/empty.json", "scripting_follow")
        );

        await login(page);

        await Map.teleportToPosition(page, 32, 32);

        const newBrowser = await browser.browserType().launch();
        const page2 = await newBrowser.newPage();
        await page2.goto(publicTestMapUrl("tests/E2E/empty.json", "scripting_follow"));
        await login(page2, "Bob");


        await Map.teleportToPosition(page2, 32, 32);

        await expect(page.locator(`.cameras-container .other-cameras .media-container`).nth(0)).toBeVisible({
            timeout: 10000
        });

        await evaluateScript(page, async () => {
            await WA.player.proximityMeeting.followMe();
            await WA.player.moveTo(300, 300);
        });

        const position = await evaluateScript(page2, async () => {
            await WA.onInit();
            return await WA.player.getPosition();
        });

        expect(position.x).toBeGreaterThan(100);
    });
});
