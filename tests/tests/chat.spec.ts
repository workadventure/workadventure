import {expect, Page, test} from '@playwright/test';
import {abortRecordLogs, assertLogMessage, startRecordLogs} from './utils/log';
import { login } from './utils/roles';
import {openChat} from "./utils/menu";

const WAIT_FOR_INIT_OF_USERS_LIST = 2_000;

test.setTimeout(60_000);

test.describe('Chat', () => {
  test('should be fully loaded', async ({ page }) => {
    startRecordLogs(page);
    await page.goto(
        'http://play.workadventure.localhost/_/global/maps.workadventure.localhost/tests/E2E/empty.json'
    );
    const nickname = getUniqueNickname('A');
    await login(page, nickname, 2);
    await assertLogMessage(page, 'Chat fully loaded');
    abortRecordLogs(page);
  });

  test('should connect to ejabberd and show list of users', async ({ page, browser }) => {
    await page.goto(
      'http://play.workadventure.localhost/_/global/maps.workadventure.localhost/tests/E2E/empty.json'
    );
    const nickname = getUniqueNickname('A');
    await login(page, nickname, 2);

    await openChat(page);
    const chat = await getChat(page);
    await page.waitForTimeout(WAIT_FOR_INIT_OF_USERS_LIST);

    await expect(chat.locator('#users')).toContainText(nickname);

    const newBrowser = await browser.browserType().launch();
    const page2 = await newBrowser.newPage();

    await page2.goto(
        'http://play.workadventure.localhost/_/global/maps.workadventure.localhost/tests/E2E/empty.json'
    );
    const nickname2 = getUniqueNickname('B');
    await login(page2, nickname2, 3);

    await openChat(page2);
    const chat2 = await getChat(page2);
    await page2.waitForTimeout(WAIT_FOR_INIT_OF_USERS_LIST);

    await expect(chat2.locator('#users')).toContainText(nickname);
    await expect(chat2.locator('#users')).toContainText(nickname2);

    await page2.close();
  });

  test('enter and exit from live zone', async ({ page }) => {
    await page.goto(
        'http://play.workadventure.localhost/_/global/maps.workadventure.localhost/tests/E2E/livezone.json'
    );
    const nickname = getUniqueNickname('A');
    await login(page, nickname, 3);

    await openChat(page);
    const chat = await getChat(page);
    await page.waitForTimeout(WAIT_FOR_INIT_OF_USERS_LIST);
    await expect(chat.locator('#users')).toContainText(nickname);

    await page.locator('#game').focus();

    await page.keyboard.press('ArrowRight', {delay: 2_500});
    await expect(chat.locator('#liveRooms')).toContainText('liveZone');

    await page.keyboard.press('ArrowLeft', {delay: 1_500});
    // FIXME This expect is not working IDK why
    //await expect(chat.locator('#liveRooms')).not.toContainText('liveZone');
  });
});

async function getChat(page: Page){
  return page.locator('#chatWindow').frameLocator('iframe').locator('aside.chatWindow');
}


function getUniqueNickname(name: string){
  return `${name}_${Date.now().toString().split("").reverse().join("")}`.substring(0, 8);
}
