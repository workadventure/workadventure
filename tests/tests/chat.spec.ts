import {expect, Page, test} from '@playwright/test';
import { startRecordLogs } from './utils/log';
import { login } from './utils/roles';
import {expectInViewport} from "./utils/viewport";

test.describe('Chat', () => {
  test('should connect to ejabberd and show list of users', async ({ page, browser }) => {
    startRecordLogs(page);
    await page.goto(
      'http://play.workadventure.localhost/_/global/maps.workadventure.localhost/tests/E2E/empty.json'
    );

    await login(page, 'Alice', 2);

    //await assertLogMessage(page, 'Chat fully loaded');

    await openChat(page);

    await expect(page.locator('#chatWindow').frameLocator('iframe').locator('aside.chatWindow')).toContainText('Users');

    const newBrowser = await browser.browserType().launch();
    const page2 = await newBrowser.newPage();

    await page2.goto(
        'http://play.workadventure.localhost/_/global/maps.workadventure.localhost/tests/E2E/empty.json'
    );

    await login(page2, 'Chapelier', 3);

    //await assertLogMessage(page2, 'Chat fully loaded');

    await openChat(page2);

    await expect(page2.locator('#chatWindow').frameLocator('iframe').locator('aside.chatWindow')).toContainText('Alice');

    await page2.close();
  });
});


async function openChat(page: Page) {
  await page.click('button.chat-btn');
  await expectInViewport("#chatWindow", page);
  await expect(page.locator('button.chat-btn')).toHaveClass(/border-top-light/);
}
