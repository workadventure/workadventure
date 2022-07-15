import {test} from '@playwright/test';
import { assertLogMessage, startRecordLogs} from './utils/log';
import { login } from './utils/roles';

test.describe('Chat', () => {
  test('should connect to ejabberd and show list of users', async ({ page }) => {
    startRecordLogs(page);
    await page.goto(
      'http://play.workadventure.localhost/_/global/maps.workadventure.localhost/starter/map.json'
    );

    await login(page, 'Alice', 2);

    await assertLogMessage(page, 'Chat fully loaded');

    //await page.click('main.menuIcon img:nth-of-type(2)');

    // FIXME Ejabberd server not starting correctly in GitHub WorkFlow
    /*await expect(page.locator('#chatWindow').frameLocator('iframe').locator('aside.chatWindow')).toContainText('Users');

    const browser = await chromium.launch();
    const page2 = await browser.newPage();

    await page2.goto(
        'http://play.workadventure.localhost/_/global/maps.workadventure.localhost/starter/map.json'
    );

    await login(page2, 'Chapelier', 3);

    await assertLogMessage(page2, 'Chat fully loaded');

    await page2.click('main.menuIcon img:nth-of-type(2)');

    await page2.waitForTimeout(500);

    await expect(page2.locator('#chatWindow').frameLocator('iframe').locator('aside.chatWindow')).toContainText('Alice');
*/  });
});
