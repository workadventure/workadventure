import { expect, test } from '@playwright/test';
import { login } from './utils/roles';
import Menu from "./utils/menu";
import {evaluateScript} from "./utils/scripting";
import {RENDERER_MODE} from "./utils/environment";

test.describe('Iframe API', () => {
  test('can be called from an iframe loading a script', async ({
    page,
  }) => {
    await page.goto(
      `http://play.workadventure.localhost/_/global/maps.workadventure.localhost/tests/Metadata/cowebsiteAllowApi.json?phaserMode=${RENDERER_MODE}`
    );

    await login(page);

    // FIXME e2e test related to chat
    //await expect(page.locator('p.other-text')).toHaveText('The iframe opened by a script works !', {useInnerText: true});
  });

  test('can add a custom menu by scripting API', async ({
    page
  }) => {
    await page.goto(
        `http://play.workadventure.localhost/_/global/maps.workadventure.localhost/tests/E2E/empty.json?phaserMode=${RENDERER_MODE}`
    );

    await login(page);

    await evaluateScript(page, async () => {
      await WA.onInit();

      WA.ui.registerMenuCommand('custom callback menu', () => {
        WA.chat.sendChatMessage('Custom menu clicked', 'Mr Robot');
      })

      WA.ui.registerMenuCommand('custom iframe menu', {iframe: '../Metadata/customIframeMenu.html'});
    });

    await Menu.openMenu(page);

    await page.click('button:has-text("custom iframe menu")');

    const iframeParagraph = page
        .frameLocator('.menu-submenu-container iframe')
        .locator('p');
    await expect(iframeParagraph).toHaveText('This is an iframe in a custom menu.');

    await page.click('button:has-text("custom callback menu")');
    await expect(
        page.frameLocator('iframe#chatWorkAdventure')
            .locator('aside.chatWindow')
            .locator(".wa-message-body")
    ).toContainText('Custom menu clicked');

    // Now, let's add a menu item and open an iframe
    await evaluateScript(page, async () => {
      await WA.onInit();

      const menu = WA.ui.registerMenuCommand('autoopen iframe menu', {iframe: '../Metadata/customIframeMenu.html'});
      await menu.open();
    });

    const iframeParagraph2 = page
        .frameLocator('.menu-submenu-container iframe')
        .locator('p');
    await expect(iframeParagraph2).toHaveText('This is an iframe in a custom menu.');

    await Menu.closeMenu(page);

    // Now, let's test that we can open a default menu:
    await evaluateScript(page, async () => {
      await WA.onInit();

      const menu = await WA.ui.getMenuCommand('invite');
      await menu.open();
    });

    await expect(page.locator('.menu-container')).toContainText("Share the link of the room");
  });

  test('base room properties', async ({
                                                          page
                                                        }) => {
    await page.goto(
        `http://play.workadventure.localhost/_/global/maps.workadventure.localhost/tests/E2E/empty.json?phaserMode=${RENDERER_MODE}#foo=bar`
    );

    await login(page);

    const parameter = await evaluateScript(page, async () => {
      await WA.onInit();

      return WA.room.hashParameters.foo;
    });

    expect(parameter).toEqual('bar');
  });
});
