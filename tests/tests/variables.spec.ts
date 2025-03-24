import fs from 'fs';
import {expect, Page, test} from '@playwright/test';
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
import {evaluateScript} from "./utils/scripting";

async function setVariable(page: Page, value: string) {
  await evaluateScript(page, async (value) => {
    await WA.onInit();
    WA.state.textField = value;
  }, value);
}

async function expectVariableToBe(page: Page, value: string) {
    const variable = await evaluateScript(page, async () => {
        await WA.onInit();
        return WA.state.textField;
    });
    expect(variable).toBe(value);
}

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
        publicTestMapUrl("tests/Variables/empty_with_variable.json", "variables") + "&somerandomparam=1");

//    const textField = page.locator('iframe[title="Cowebsite"]').contentFrame().locator('#textField');

    await expectVariableToBe(page, 'default value');

    await setVariable(page, 'new value');

    await page.goto(
      publicTestMapUrl("tests/Variables/empty_with_variable.json", "variables")
    );
    await expectVariableToBe(page, 'new value');

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

    await expectVariableToBe(page, 'new value');

    stopRedis();

    await setVariable(page, 'value set while Redis stopped');

    startRedis();
    await page.goto(maps_test_url);

    const backDump = await getBackDump();
    //console.log('backDump', backDump);
    for (const room of backDump) {
      if (
        room.roomUrl ===
        new URL(`/_/global/${maps_domain}/tests/Variables/empty_with_variable.json`, play_url).toString()
      ) {
        throw new Error('Room still found in back');
      }
    }

    const pusherDump = await getPusherDump();
    //console.log('pusherDump', pusherDump);
    await expect(
      pusherDump[
        new URL(`/_/global/${maps_domain}/tests/Variables/empty_with_variable.json`, play_url).toString()
      ]
    ).toBe(undefined);

    await page.goto(publicTestMapUrl("tests/Variables/empty_with_variable.json", "variables"))

    // Redis will reconnect automatically and will store the variable on reconnect!
    // So we should see the new value.
    // FIXME: we should wait for potential variable changes if Redis did not reconnect yet
    await expectVariableToBe(page, 'value set while Redis stopped');

    // Now, let's try to kill / reboot the back
    await rebootBack();
    await page.goto(publicTestMapUrl("tests/Variables/empty_with_variable.json", "variables"));
    /*await gotoWait200(
        page,
      publicTestMapUrl("tests/Variables/empty_with_variable.json", "variables")
    );*/
    await expectVariableToBe(page, 'value set while Redis stopped');

    await setVariable(page, 'value set after back restart');

    await page.goto(
      publicTestMapUrl("tests/Variables/empty_with_variable.json", "variables")
    );
    // Redis will reconnect automatically and will store the variable on reconnect!
    // So we should see the new value.
    await expectVariableToBe(page, 'value set after back restart');

    // Now, let's try to kill / reboot the back
    await rebootPlay(request);

    await page.goto(publicTestMapUrl("tests/Variables/empty_with_variable.json", "variables"));
    //await gotoWait200(page, publicTestMapUrl("tests/Variables/empty_with_variable.json", "variables"));

    await expectVariableToBe(page, 'value set after back restart');

    await setVariable(page, 'value set after pusher restart');

    await page.goto(
      publicTestMapUrl("tests/Variables/empty_with_variable.json", "variables")
    );
    // Redis will reconnect automatically and will store the variable on reconnect!
    // So we should see the new value.
    await expectVariableToBe(page, 'value set after pusher restart');

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
