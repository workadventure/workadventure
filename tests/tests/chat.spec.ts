import {chromium, expect, test} from '@playwright/test';
import {abortRecordLogs, assertLogMessage, startRecordLogs} from './utils/log';
import { login } from './utils/roles';
import {openChat} from "./utils/menu";

test.setTimeout(60_000);
test.describe('Chat', () => {
  test('should be fully loaded', async ({ page }) => {
    startRecordLogs(page);
    await page.goto(
        'http://play.workadventure.localhost/_/global/maps.workadventure.localhost/tests/E2E/empty.json'
    );

    await login(page, 'Alice', 2);
    await assertLogMessage(page, 'Chat fully loaded');
    abortRecordLogs(page);
  });

  test('should connect to ejabberd and show list of users', async ({ page }) => {
    await page.goto(
      'http://play.workadventure.localhost/_/global/maps.workadventure.localhost/tests/E2E/empty.json'
    );

    await login(page, 'Alice', 2);

    await openChat(page);

    await page.waitForTimeout(5_000);

    await expect(page.locator('#chatWindow').frameLocator('iframe').locator('aside.chatWindow')).toContainText('Alice');

    const browser = await chromium.launch();
    const page2 = await browser.newPage();

    await page2.goto(
        'http://play.workadventure.localhost/_/global/maps.workadventure.localhost/tests/E2E/empty.json'
    );

    await login(page2, 'Chat', 3);

    await openChat(page2);

    await page.waitForTimeout(5_000);

    await expect(page2.locator('#chatWindow').frameLocator('iframe').locator('aside.chatWindow')).toContainText('Alice');

    await expect(page.locator('#chatWindow').frameLocator('iframe').locator('aside.chatWindow')).toContainText('Chat');

    await page2.close();
  });
});
