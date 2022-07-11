import { expect, test, chromium } from '@playwright/test';
import { login } from './utils/roles';
import {getCoWebsiteIframe} from "./utils/iframe";
import {assertLogMessage} from "./utils/log";
import {evaluateScript} from "./utils/scripting";

test.describe('API WA.players', () => {
  test('enter leave events are received', async ({ page }) => {
    await page.goto(
      'http://play.workadventure.localhost/_/global/maps.workadventure.localhost/tests/RemotePlayers/remote_players.json'
    );
    await login(page, 'Alice');

    const browser = await chromium.launch();
    const page2 = await browser.newPage();

    await page2.goto(
      'http://play.workadventure.localhost/_/global/maps.workadventure.localhost/tests/RemotePlayers/remote_players.json'
    );

    await login(page2, 'Bob');

    const events = getCoWebsiteIframe(page).locator('#events');
    await expect(events).toContainText('New user: Bob');

    await getCoWebsiteIframe(page).locator('#listCurrentPlayers').click();
    const list = getCoWebsiteIframe(page).locator('#list');
    await expect(list).toContainText('Bob');

    await getCoWebsiteIframe(page2).locator('#listCurrentPlayers').click();
    const list2 = getCoWebsiteIframe(page2).locator('#list');
    await expect(list2).toContainText('Alice');

    // Now, let's test variables
    await getCoWebsiteIframe(page).locator('#the-variable').fill('yeah');
    await getCoWebsiteIframe(page).locator('#the-variable').evaluate(e => e.blur());
    const events2 = getCoWebsiteIframe(page2).locator('#events');
    await expect(events2).toContainText("User 'Alice' testVariable changed. New value: yeah (tracked globally)");
    await expect(events2).toContainText("User 'Alice' testVariable changed. New value: yeah (tracked locally)");
    await expect(events2).toContainText("Asserted value from event and from WA.players.state is the same");

    await page2.close();

    await expect(events).toContainText('User left: Bob');
    await getCoWebsiteIframe(page).locator('#listCurrentPlayers').click();
    await expect(list).not.toContainText('Bob');
  });

  test('exception if we forget to call WA.players.enableTracking', async ({ page }) => {
    await page.goto(
        'http://play.workadventure.localhost/_/global/maps.workadventure.localhost/tests/RemotePlayers/remote_players_no_init.json'
    );
    await login(page);

    await expect(getCoWebsiteIframe(page).locator('#onPlayerEntersException')).toHaveText('Yes');
    await expect(getCoWebsiteIframe(page).locator('#onPlayerLeavesException')).toHaveText('Yes');
  });

  test('Test that player B arriving after player A set his variables can read the variable.', async ({ page }) => {
    await page.goto(
        'http://play.workadventure.localhost/_/global/maps.workadventure.localhost/tests/E2E/empty.json'
    );

    await login(page, "Alice");

    await evaluateScript(page, async () => {
      await WA.onInit();

      WA.player.sharedState.myvar = 12;
      return;
    });

    const browser = await chromium.launch();
    const page2 = await browser.newPage();

    await page2.goto(
        'http://play.workadventure.localhost/_/global/maps.workadventure.localhost/tests/E2E/empty.json'
    );

    await login(page2, 'Bob');

    const myvar = await evaluateScript(page2, async () => {
      await WA.onInit();
      await WA.players.enableTracking();

      for (const player of WA.players.list()) {
        return player.state.myvar;
      }
    });

    expect(myvar).toBe(12);
  });

});
