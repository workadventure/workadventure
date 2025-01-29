import {expect, test, webkit} from '@playwright/test';
import {evaluateScript} from "./utils/scripting";
import Map from './utils/map';
import {publicTestMapUrl} from "./utils/urls";
import { getPage } from './utils/auth';

test.describe('Scripting follow functions', () => {
    test('can trigger follow from script', async ({ browser}, { project }) => {
        // It seems WebRTC fails to start on Webkit
        if(browser.browserType() === webkit) {
            //eslint-disable-next-line playwright/no-skipped-test
            test.skip();
            return;
        }
        const page = await getPage(browser, 'Alice', publicTestMapUrl("tests/E2E/empty.json", "scripting_follow"))
        await Map.teleportToPosition(page, 32, 32);

        const page2 = await getPage(browser, 'Bob', publicTestMapUrl("tests/E2E/empty.json", "scripting_follow"));
        await Map.teleportToPosition(page2, 32, 32);

        await expect(page.getByText('Bob')).toBeVisible();

        const waitForFollowPromise = evaluateScript(page, async () => {
            return new Promise<void>((resolve) => {
                WA.player.proximityMeeting.onFollowed().subscribe(() => {
                    resolve();
                });
            });
        });

        await evaluateScript(page, async () => {
            await WA.player.proximityMeeting.followMe();
            await WA.player.moveTo(300, 300);
        });

        await waitForFollowPromise;

        let position = await Map.getPosition(page2);

        if (position.x < 100) {
            // Wait a bit, maybe Bob was slow to start
            await page2.waitForTimeout(2000);
            position = await Map.getPosition(page2);
        }

        expect(position.x).toBeGreaterThan(100);

        // Now, let's stop loading the users and move to the top right of the map
        await evaluateScript(page, async () => {
            await WA.player.proximityMeeting.stopLeading();
            await WA.player.moveTo(300, 32);
        });

        // Let's check that Bob is not following us anymore
        position = await Map.getPosition(page2);

        expect(position.y).toBeGreaterThan(100);

        // Let's move back Bob in the same position as Alice
        await Map.teleportToPosition(page2, 300, 32);

        // Alice triggers a follow request and bob cancels it
        await evaluateScript(page, async () => {
            await WA.player.proximityMeeting.followMe();
        });

        const waitForUnfollowPromise = evaluateScript(page, async () => {
            return new Promise<void>((resolve) => {
                WA.player.proximityMeeting.onUnfollowed().subscribe(() => {
                    resolve();
                });
            });
        });

        await page2.getByRole('button', { name: 'Stop following' }).click();

        await waitForUnfollowPromise;
        await page2.close();
        await page2.context().close();
        await page.close();
        await page.context().close();
    });
});
