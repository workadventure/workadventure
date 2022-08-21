
import {} from "../../front/packages/iframe-api-typings/iframe_api";
//import {} from "../../front/src/iframe_api";
import {expect, test, Browser, Page} from '@playwright/test';
import { login } from './utils/roles';
import {getCoWebsiteIframe} from "./utils/iframe";
import {assertLogMessage} from "./utils/log";
import {evaluateScript} from "./utils/scripting";
import {oidcLogin, oidcLogout} from "./utils/oidc";

test.describe('API WA.players', () => {
  test('enter leave events are received', async ({ page, browser }) => {
    await page.goto(
      'http://play.workadventure.localhost/_/global/maps.workadventure.localhost/tests/RemotePlayers/remote_players.json'
    );
    await login(page, 'Alice');

    const newBrowser = await browser.browserType().launch();
    const page2 = await newBrowser.newPage();

    await page2.goto(
      'http://play.workadventure.localhost/_/global/maps.workadventure.localhost/tests/RemotePlayers/remote_players.json'
    );

    await login(page2, 'Bob');

    const events = getCoWebsiteIframe(page).locator('#events');
    await expect(events).toContainText('New user: Bob', {
      timeout: 10000
    });

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

  test('exception if we forget to call WA.players.configureTracking', async ({ page }) => {
    await page.goto(
        'http://play.workadventure.localhost/_/global/maps.workadventure.localhost/tests/RemotePlayers/remote_players_no_init.json'
    );
    await login(page);

    await expect(getCoWebsiteIframe(page).locator('#onPlayerEntersException')).toHaveText('Yes');
    await expect(getCoWebsiteIframe(page).locator('#onPlayerLeavesException')).toHaveText('Yes');
  });

  test('Test that player B arriving after player A set his variables can read the variable.', async ({ page, browser }) => {
    await page.goto(
        'http://play.workadventure.localhost/_/global/maps.workadventure.localhost/tests/E2E/empty.json'
    );

    await login(page, "Alice");

    await evaluateScript(page, async () => {
      await WA.onInit();

      WA.player.state.myvar = 12;
      return;
    });

    const newBrowser = await browser.browserType().launch();
    const page2 = await newBrowser.newPage();

    await page2.goto(
        'http://play.workadventure.localhost/_/global/maps.workadventure.localhost/tests/E2E/empty.json'
    );

    await login(page2, 'Bob');

    const myvar = await evaluateScript(page2, async () => {
      await WA.onInit();
      await WA.players.configureTracking();

      for (const player of WA.players.list()) {
        return player.state.myvar;
      }
    });

    await expect(myvar).toBe(12);

    await page2.close();
  });

  const runPersistenceTest = async (page: Page, browser: Browser) => {
    await evaluateScript(page, async () => {



      /*function later(delay) {
        return new Promise(function(resolve) {
          setTimeout(resolve, delay);
        });
      }

      for (let i = 0; i < 50; i++) {
        if (WA) {
          break;
        }
        await later(100);
      }
      if (WA === undefined) {
        throw new Error("Could not find WA object");
      }*/



      await WA.onInit();

      await WA.player.state.saveVariable('non_public_persisted', 'non_public_persisted', {
        public: false,
        persist: true,
        scope: "room",
      });

      await WA.player.state.saveVariable('public_persisted', 'public_persisted', {
        public: true,
        persist: true,
        scope: "room",
      });

      await WA.player.state.saveVariable('non_public_non_persisted', 'non_public_non_persisted', {
        public: false,
        persist: false,
        scope: "room",
      });

      await WA.player.state.saveVariable('public_non_persisted', 'public_non_persisted', {
        public: true,
        persist: false,
        scope: "room",
      });

      // persist: false + world is not possible!
      /*WA.player.state.saveVariable('world', 'world', {
        public: true,
        persist: false,
        scope: "world",
      });*/

      return;
    });

    const newBrowser = await browser.browserType().launch();
    const page2 = await newBrowser.newPage();

    await page2.goto(
        'http://play.workadventure.localhost/_/global/maps.workadventure.localhost/tests/E2E/empty.json'
    );

    await login(page2, 'Bob');

    const readRemotePlayerVariable = async (name: string, targetPage: Page): Promise<unknown> => {
      return await evaluateScript(targetPage, async (name: string) => {
        await WA.onInit();
        await WA.players.configureTracking();

        for (const player of WA.players.list()) {
          return player.state[name];
        }
      }, name);
    }

    const readLocalPlayerVariable = async (name: string, targetPage: Page): Promise<unknown> => {
      return await evaluateScript(targetPage, async (name: string) => {
        await WA.onInit();

        return WA.player.state[name];
      }, name);
    }

    // We should not be able to read a non public variable from another user
    await expect(await readRemotePlayerVariable('non_public_persisted', page2)).toBe(undefined);
    await expect(await readRemotePlayerVariable('non_public_non_persisted', page2)).toBe(undefined);
    await expect.poll(() => readRemotePlayerVariable('public_non_persisted', page2)).toBe('public_non_persisted');
    await expect.poll(() =>  readRemotePlayerVariable('public_persisted', page2)).toBe('public_persisted');

    // The user himself should always be allowed to read his own variables
    await expect.poll(() => readLocalPlayerVariable('non_public_persisted', page)).toBe('non_public_persisted');
    await expect.poll(() => readLocalPlayerVariable('non_public_non_persisted', page)).toBe('non_public_non_persisted');
    await expect.poll(() => readLocalPlayerVariable('public_non_persisted', page)).toBe('public_non_persisted');
    await expect.poll(() => readLocalPlayerVariable('public_persisted', page)).toBe('public_persisted');

    /*console.log("PAGE 1 MY ID", await evaluateScript(page, async () => {
      await WA.onInit();
      return WA.player.id;
    }));*/

    // Let's reload the first page to test the refresh
    if (browser.browserType().name() === "webkit") {
      // Skip this test for webkit because there is a bug in page.reload().
      // See https://github.com/microsoft/playwright/issues/16147
      return;
    }
    await page.reload();

    // Let's wait for page to be reloaded
    await evaluateScript(page, async () => {
      await WA.onInit();
    });

    /*console.log("PAGE 1 MY ID", await evaluateScript(page, async () => {
      await WA.onInit();
      return WA.player.id;
    }));*/

    // Non persisted variables should be gone now
    await expect.poll(() => readRemotePlayerVariable('non_public_persisted', page2)).toBe(undefined);
    await expect.poll(() => readRemotePlayerVariable('non_public_non_persisted', page2)).toBe(undefined);
    await expect.poll(() => readRemotePlayerVariable('public_non_persisted', page2)).toBe(undefined);
    await expect.poll(() => readRemotePlayerVariable('public_persisted', page2)).toBe('public_persisted');

    // The user himself should always be allowed to read his own persisted variables
    await expect.poll(() => readLocalPlayerVariable('non_public_persisted', page)).toBe('non_public_persisted');
    await expect.poll(() => readLocalPlayerVariable('non_public_non_persisted', page)).toBe(undefined);
    await expect.poll(() => readLocalPlayerVariable('public_non_persisted', page)).toBe(undefined);
    await expect.poll(() => readLocalPlayerVariable('public_persisted', page)).toBe('public_persisted');

    await page2.close();

  };


  test('Test variable persistence for anonymous users.', async ({ page, browser }) => {
    await page.goto(
        'http://play.workadventure.localhost/_/global/maps.workadventure.localhost/tests/E2E/empty.json'
    );

    await login(page, "Alice");

    await runPersistenceTest(page, browser);
  });

  test('Test variable persistence for logged users.', async ({ page, browser }) => {
    await page.goto(
        'http://play.workadventure.localhost/_/global/maps.workadventure.localhost/tests/E2E/empty.json'
    );

    await login(page, "Alice");

    await oidcLogin(page);

    await runPersistenceTest(page, browser);

    await oidcLogout(page);
  });


  test('Test variables are sent across frames.', async ({ page }) => {
    await page.goto(
        'http://play.workadventure.localhost/_/global/maps.workadventure.localhost/tests/E2E/empty_2_frames.json'
    );

    await login(page, "Alice");

    await evaluateScript(page, async () => {
      await WA.onInit();

      WA.player.state.onVariableChange('myvar').subscribe(() => {
        console.log("myvar CHANGE TRIGGERED");
      })
      return;
    }, null, "embedded_iframe");

    const awaitLog = assertLogMessage(page, "myvar CHANGE TRIGGERED");

    await evaluateScript(page, async () => {
      await WA.onInit();
      WA.player.state.myvar = 12;
      return;
    });

    await awaitLog;

    const variable = await evaluateScript(page, async () => {
      await WA.onInit();

      return WA.player.state.myvar;
    }, "embedded_iframe");
    await expect(variable).toBe(12);
  });

  // This test is testing that we are listening on the back side to variables modification inside Redis.
  // All players with same UUID should share the same state (public or private as long as it is persisted)
  test('Test that 2 players sharing the same UUID are notified of persisted private variable changes.', async ({ page, context }) => {
    await page.goto(
        'http://play.workadventure.localhost/_/global/maps.workadventure.localhost/tests/E2E/empty.json'
    );

    await login(page, "Alice");

    /*console.log("PAGE 1 MY ID", await evaluateScript(page, async () => {
      await WA.onInit();
      return WA.player.id;
    }));*/

    // We use a new tab to keep the same LocalStorage
    const page2 = await context.newPage();

    await page2.goto(
        'http://play.workadventure.localhost/_/global/maps.workadventure.localhost/tests/E2E/empty.json'
    );

    /*console.log("PAGE 2 MY ID", await evaluateScript(page2, async () => {
      await WA.onInit();
      return WA.player.id;
    }));*/


    let gotExpectedNotification = false;
    let gotUnexpectedNotification = false;
    await page2.on('console', async (msg) => {
      const text = await msg.text();
      //console.log(text);
      if (text === 'NOTIFICATION RECEIVED FOR should_be_notified VARIABLE CHANGE') {
        gotExpectedNotification = true;
      } else if (text === 'NOTIFICATION RECEIVED FOR should_not_be_notified VARIABLE CHANGE') {
        gotUnexpectedNotification = true;
      }
    });


    await evaluateScript(page2, async () => {
      await WA.onInit();
      await WA.players.configureTracking();

      WA.player.state.onVariableChange('should_be_notified').subscribe(() => {
        console.log('NOTIFICATION RECEIVED FOR should_be_notified VARIABLE CHANGE');
      });
      WA.player.state.onVariableChange('should_not_be_notified').subscribe(() => {
        console.error('NOTIFICATION RECEIVED FOR should_not_be_notified VARIABLE CHANGE');
      });

      return;
    });


    await evaluateScript(page, async () => {
      await WA.onInit();

      await WA.player.state.saveVariable('should_be_notified', 'should_be_notified', {
        public: false,
        persist: true,
        scope: "room",
      });

      await WA.player.state.saveVariable('should_not_be_notified', 'should_not_be_notified', {
        public: false,
        persist: false,
        scope: "room",
      });

      return;
    });

    await expect.poll(() => gotExpectedNotification).toBe(true);
    await expect.poll(() => gotUnexpectedNotification).toBe(false);

    await page2.close();
  });

});
