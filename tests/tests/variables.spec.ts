import fs from 'fs';
import { expect, test } from '@playwright/test';
import {

  rebootBack,
  rebootPlay,
  resetRedis,
  startRedis, startTraefik,
  stopRedis, stopTraefik,
} from './utils/containers';
import {getBackDump, getPusherDump, getPusherRooms} from './utils/debug';
import {assertLogMessage, startRecordLogs} from './utils/log';
import {maps_domain, maps_test_url, play_url, publicTestMapUrl} from "./utils/urls";
import { getPage } from "./utils/auth";
import {isMobile} from "./utils/isMobile";

test.setTimeout(360000);
test.describe('Variables', () => {
  test.beforeEach(async ({ page }) => {
    if (isMobile(page)) {
      //eslint-disable-next-line playwright/no-skipped-test
      test.skip();
    }
  });
  // WARNING: Since this test restarts Traefik and other components, it might fail when run against the vite dev server.
  // when running with --headed you can manually reload the page to avoid this issue.
  test('storage works @docker', async ({ browser, request }, { project }) => {
    // Skip test for Firefox because of some bug when reloading too many pages.
    if(project.name === "firefox") {
      //eslint-disable-next-line playwright/no-skipped-test
      test.skip();
      return;
    }

    await resetRedis();

    await Promise.all([rebootBack(), rebootPlay(request)]);

    const page = await getPage(browser, 'Alice',
        publicTestMapUrl("tests/Variables/shared_variables.json", "variables") + "&somerandomparam=1");
    const textField = page.locator('iframe[title="Cowebsite"]').contentFrame().locator('#textField');

    await expect(textField).toHaveValue('default value');
    await textField.fill('');
    await textField.fill('new value');
    await textField.press('Tab');

    await page.goto(
      publicTestMapUrl("tests/Variables/shared_variables.json", "variables")
    );
    await expect(textField).toHaveValue('new value');

    // Let's simulate a browser disconnection
    await stopTraefik();
    // Let's detect the reconnecting screen
    await expect(page.getByTestId('camera-button')).toBeHidden();
    await startTraefik();

    // Now, let's kill the reverse proxy to cut the connexion
    /*console.log('Rebooting traefik');
    rebootTraefik();
    console.log('Rebooting done');*/

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
    await page.goto(maps_test_url);

    const backDump = await getBackDump();
    //console.log('backDump', backDump);
    for (const room of backDump) {
      if (
        room.roomUrl ===
        new URL(`/_/global/${maps_domain}/tests/Variables/shared_variables.json`, play_url).toString()
      ) {
        throw new Error('Room still found in back');
      }
    }

    const pusherDump = await getPusherDump();
    //console.log('pusherDump', pusherDump);
    await expect(
      pusherDump[
        new URL(`/_/global/${maps_domain}/tests/Variables/shared_variables.json`, play_url).toString()
      ]
    ).toBe(undefined);

    await page.goto(publicTestMapUrl("tests/Variables/shared_variables.json", "variables"))

    // Redis will reconnect automatically and will store the variable on reconnect!
    // So we should see the new value.
    await expect(textField).toHaveValue('value set while Redis stopped', {
      timeout: 60000,
    });

    // Now, let's try to kill / reboot the back
    await rebootBack();
    await page.goto(publicTestMapUrl("tests/Variables/shared_variables.json", "variables"));
    /*await gotoWait200(
        page,
      publicTestMapUrl("tests/Variables/shared_variables.json", "variables")
    );*/
    await expect(textField).toHaveValue('value set while Redis stopped', {
      timeout: 60000,
    });
    await textField.fill('');
    await textField.fill('value set after back restart');
    await textField.press('Tab');

    await page.goto(
      publicTestMapUrl("tests/Variables/shared_variables.json", "variables")
    );
    // Redis will reconnect automatically and will store the variable on reconnect!
    // So we should see the new value.
    await expect(textField).toHaveValue('value set after back restart');

    // Now, let's try to kill / reboot the back
    await rebootPlay(request);

    await page.goto(publicTestMapUrl("tests/Variables/shared_variables.json", "variables"));
    //await gotoWait200(page, publicTestMapUrl("tests/Variables/shared_variables.json", "variables"));

    await expect(textField).toHaveValue('value set after back restart', {
      timeout: 60000,
    });
    await textField.fill('');
    await textField.fill('value set after pusher restart');
    await textField.press('Tab');

    await page.goto(
      publicTestMapUrl("tests/Variables/shared_variables.json", "variables")
    );
    // Redis will reconnect automatically and will store the variable on reconnect!
    // So we should see the new value.
    await expect(textField).toHaveValue('value set after pusher restart');

    await page.close();
    await page.context().close();
  });

  test('cache doesnt prevent setting a variable in case the map changes @local',
      async ({ browser,  request }) => {
    // Let's start by visiting a map that DOES not have the variable.
    fs.copyFileSync(
      '../maps/tests/Variables/Cache/variables_cache_1.json',
      '../maps/tests/Variables/Cache/variables_tmp.json'
    );
    const page = await getPage(browser, 'Alice',
        publicTestMapUrl("tests/Variables/Cache/variables_tmp.json", "variables"));


    // Let's REPLACE the map by a map that has a new variable
    // At this point, the back server contains a cache of the old map (with no variables)
    fs.copyFileSync(
      '../maps/tests/Variables/Cache/variables_cache_2.json',
      '../maps/tests/Variables/Cache/variables_tmp.json'
    );
    const page2 = await getPage(browser, 'Bob',
        publicTestMapUrl("tests/Variables/Cache/variables_tmp.json", "variables"),
        { pageCreatedHook: (page2) => startRecordLogs(page2) });

    // Let's check we successfully manage to save the variable value.
    await assertLogMessage(page2, 'SUCCESS!');

    // Let's check the pusher getRooms endpoint returns 2 users on the map
    await expect.poll(async () => {
      const rooms = await getPusherRooms(request);
      const json = await rooms.json();
      const users = json[`${play_url}/_/variables/${maps_domain}/tests/Variables/Cache/variables_tmp.json`] ?? 0;
      return users;
    }).toBe(2);

    await page2.close();
    await page2.context().close();
    await page.close();
    await page.context().close();
  });
});

/*function timeout(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}*/
