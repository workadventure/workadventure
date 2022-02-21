import { expect, test, chromium } from '@playwright/test';
import fs from 'fs';
import {
  rebootBack,
  rebootPusher,
  rebootTraefik,
  resetRedis,
  startRedis,
  stopRedis,
} from './utils/containers';
import { getBackDump, getPusherDump } from './utils/debug';
import { assertLogMessage } from './utils/log';
import { login } from './utils/roles';

test.setTimeout(180000);
test.describe('Variables', () => {
  // WARNING: Since this test restarts traefik and other components, it might fail when run against the vite dev server.
  // when running with --headed you can manually reload the page to avoid this issue.
  test('storage works', async ({ page }) => {
    await resetRedis();

    await Promise.all([rebootBack(), rebootPusher()]);

    await page.goto(
      'http://play.workadventure.localhost/_/global/maps.workadventure.localhost/tests/Variables/shared_variables.json?somerandomparam=1'
    );
    await login(page);

    const textField = page
      .frameLocator('#cowebsite-buffer iframe')
      .locator('#textField');
    await expect(textField).toHaveValue('default value');
    await textField.fill('');
    await textField.fill('new value');
    await textField.press('Tab');

    await page.goto(
      'http://play.workadventure.localhost/_/global/maps.workadventure.localhost/tests/Variables/shared_variables.json'
    );
    await expect(textField).toHaveValue('new value');

    // Now, let's kill the reverse proxy to cut the connexion
    console.log('Rebooting traefik');
    rebootTraefik();
    console.log('Rebooting done');

    // Maybe we should:
    // 1: stop Traefik
    // 2: detect reconnecting screen
    // 3: start Traefik again

    await expect(textField).toHaveValue('new value', { timeout: 60000 });

    stopRedis();
    await textField.fill('');
    await textField.fill('value set while Redis stopped');
    await textField.press('Tab');

    startRedis();
    await page.goto('http://maps.workadventure.localhost/tests/');

    const backDump = await getBackDump();
    //console.log('backDump', backDump);
    for (const room of backDump) {
      if (
        room.roomUrl ===
        'http://play.workadventure.localhost/_/global/maps.workadventure.localhost/tests/Variables/shared_variables.json'
      ) {
        throw new Error('Room still found in back');
      }
    }

    const pusherDump = await getPusherDump();
    //console.log('pusherDump', pusherDump);
    expect(
      pusherDump[
        'http://play.workadventure.localhost/_/global/maps.workadventure.localhost/tests/Variables/shared_variables.json'
      ]
    ).toBe(undefined);

    await page.goto(
      'http://play.workadventure.localhost/_/global/maps.workadventure.localhost/tests/Variables/shared_variables.json'
    );
    // Redis will reconnect automatically and will store the variable on reconnect!
    // So we should see the new value.
    await expect(textField).toHaveValue('value set while Redis stopped');

    // Now, let's try to kill / reboot the back
    await rebootBack();

    await page.goto(
      'http://play.workadventure.localhost/_/global/maps.workadventure.localhost/tests/Variables/shared_variables.json'
    );
    await expect(textField).toHaveValue('value set while Redis stopped', {
      timeout: 60000,
    });
    await textField.fill('');
    await textField.fill('value set after back restart');
    await textField.press('Tab');

    await page.goto(
      'http://play.workadventure.localhost/_/global/maps.workadventure.localhost/tests/Variables/shared_variables.json'
    );
    // Redis will reconnect automatically and will store the variable on reconnect!
    // So we should see the new value.
    await expect(textField).toHaveValue('value set after back restart');

    // Now, let's try to kill / reboot the back
    await rebootPusher();

    await page.goto(
      'http://play.workadventure.localhost/_/global/maps.workadventure.localhost/tests/Variables/shared_variables.json'
    );
    await expect(textField).toHaveValue('value set after back restart', {
      timeout: 60000,
    });
    await textField.fill('');
    await textField.fill('value set after pusher restart');
    await textField.press('Tab');

    await page.goto(
      'http://play.workadventure.localhost/_/global/maps.workadventure.localhost/tests/Variables/shared_variables.json'
    );
    // Redis will reconnect automatically and will store the variable on reconnect!
    // So we should see the new value.
    await expect(textField).toHaveValue('value set after pusher restart');
  });

  test('cache doesnt prevent setting a variable in case the map changes', async ({
    page,
  }) => {
    // Let's start by visiting a map that DOES not have the variable.

    fs.copyFileSync(
      '../maps/tests/Variables/Cache/variables_cache_1.json',
      '../maps/tests/Variables/Cache/variables_tmp.json'
    );

    await page.goto(
      'http://play.workadventure.localhost/_/global/maps.workadventure.localhost/tests/Variables/Cache/variables_tmp.json'
    );

    await login(page, 'Alice', 2);

    // Let's REPLACE the map by a map that has a new variable
    // At this point, the back server contains a cache of the old map (with no variables)
    fs.copyFileSync(
      '../maps/tests/Variables/Cache/variables_cache_2.json',
      '../maps/tests/Variables/Cache/variables_tmp.json'
    );

    const browser = await chromium.launch();
    const page2 = await browser.newPage();

    await page2.goto(
      'http://play.workadventure.localhost/_/global/maps.workadventure.localhost/tests/Variables/Cache/variables_tmp.json'
    );

    await login(page2, 'Alice', 2);

    // Let's check we successfully manage to save the variable value.
    await assertLogMessage(page2, 'SUCCESS!');
  });
});
