import {chromium, expect, Page, test} from '@playwright/test';
import { assertLogMessage, startRecordLogs} from './utils/log';
import { login } from './utils/roles';
import {inViewport} from "./utils/viewport";

test.describe('Chat', () => {
  test('should connect to ejabberd and show list of users', async ({ page }) => {
    startRecordLogs(page);
    await page.goto(
      'http://play.workadventure.localhost/_/global/maps.workadventure.localhost/starter/map.json'
    );

    await login(page, 'Alice', 2);

    await assertLogMessage(page, 'Chat fully loaded');

    await openChat(page);

    await expect(page.locator('#chatWindow').frameLocator('iframe').locator('aside.chatWindow')).toContainText('Users');

    const browser = await chromium.launch();
    const page2 = await browser.newPage();

    await page2.goto(
        'http://play.workadventure.localhost/_/global/maps.workadventure.localhost/starter/map.json'
    );

    await login(page2, 'Chapelier', 3);

    await assertLogMessage(page2, 'Chat fully loaded');

    await openChat(page);

    await expect(page2.locator('#chatWindow').frameLocator('iframe').locator('aside.chatWindow')).toContainText('Alice');
  });
});


async function openChat(page: Page) {
  await page.click('.bottom-action-bar .bottom-action-section:nth-of-type(1) .bottom-action-button:nth-of-type(3) button');
  await expect(await inViewport("#chatWindow", page)).toBeTruthy();
}
