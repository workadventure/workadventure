import {expect, test, chromium, Page} from '@playwright/test';
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

      WA.player.state.myvar = 12;
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

    await page2.close();
  });

  test('Test variable persistence.', async ({ page }) => {
    await page.goto(
        'http://play.workadventure.localhost/_/global/maps.workadventure.localhost/tests/E2E/empty.json'
    );

    await login(page, "Alice");

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

      WA.player.state.saveVariable('non_public_persisted', 'non_public_persisted', {
        public: false,
        persist: true,
        scope: "room",
      });

      WA.player.state.saveVariable('public_persisted', 'public_persisted', {
        public: true,
        persist: true,
        scope: "room",
      });

      WA.player.state.saveVariable('non_public_non_persisted', 'non_public_non_persisted', {
        public: false,
        persist: false,
        scope: "room",
      });

      WA.player.state.saveVariable('public_non_persisted', 'public_non_persisted', {
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

    const browser = await chromium.launch();
    const page2 = await browser.newPage();

    await page2.goto(
        'http://play.workadventure.localhost/_/global/maps.workadventure.localhost/tests/E2E/empty.json'
    );

    await login(page2, 'Bob');

    const readRemotePlayerVariable = async (name: string, targetPage: Page): Promise<unknown> => {
      return await evaluateScript(targetPage, async (name: string) => {
        await WA.onInit();
        await WA.players.enableTracking();

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
    expect(await readRemotePlayerVariable('non_public_persisted', page2)).toBe(undefined);
    expect(await readRemotePlayerVariable('non_public_non_persisted', page2)).toBe(undefined);
    expect(await readRemotePlayerVariable('public_non_persisted', page2)).toBe('public_non_persisted');
    expect(await readRemotePlayerVariable('public_persisted', page2)).toBe('public_persisted');

    // The user himself should always be allowed to read his own variables
    expect(await readLocalPlayerVariable('non_public_persisted', page)).toBe('non_public_persisted');
    expect(await readLocalPlayerVariable('non_public_non_persisted', page)).toBe('non_public_non_persisted');
    expect(await readLocalPlayerVariable('public_non_persisted', page)).toBe('public_non_persisted');
    expect(await readLocalPlayerVariable('public_persisted', page)).toBe('public_persisted');

    /*console.log("PAGE 1 MY ID", await evaluateScript(page, async () => {
      await WA.onInit();
      return WA.player.id;
    }));*/

    // Let's reload the first page to test the refresh
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
    expect(await readRemotePlayerVariable('non_public_persisted', page2)).toBe(undefined);
    expect(await readRemotePlayerVariable('non_public_non_persisted', page2)).toBe(undefined);
    expect(await readRemotePlayerVariable('public_non_persisted', page2)).toBe(undefined);
    expect(await readRemotePlayerVariable('public_persisted', page2)).toBe('public_persisted');

    // The user himself should always be allowed to read his own persisted variables
    expect(await readLocalPlayerVariable('non_public_persisted', page)).toBe('non_public_persisted');
    expect(await readLocalPlayerVariable('non_public_non_persisted', page)).toBe(undefined);
    expect(await readLocalPlayerVariable('public_non_persisted', page)).toBe(undefined);
    expect(await readLocalPlayerVariable('public_persisted', page)).toBe('public_persisted');

    await page2.close();

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
    expect(variable).toBe(12);
  });

});
