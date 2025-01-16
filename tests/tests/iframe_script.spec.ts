import { chromium, expect, test } from "@playwright/test";
import { login } from "./utils/roles";
import { evaluateScript } from "./utils/scripting";
import { publicTestMapUrl } from "./utils/urls";
import Menu from "./utils/menu";
import {oidcAdminTagLogin} from "./utils/oidc";

test.describe("Iframe API", () => {
  test("can be called from an iframe loading a script", async ({ page }, {
    project,
  }) => {
    // Skip test for mobile device
    if (project.name === "mobilechromium") {
      //eslint-disable-next-line playwright/no-skipped-test
      test.skip();
      return;
    }

    await page.goto(
      publicTestMapUrl("tests/Metadata/cowebsiteAllowApi.json", "iframe_script")
    );

    await login(page, 'Alice', 2, 'en-US');

    // FIXME e2e test related to chat
    //await expect(page.locator('p.other-text')).toHaveText('The iframe opened by a script works !', {useInnerText: true});
  });

  /* THIS TEST IS IGNORE BECAUSE IT's USING THE OLD CHAT
  test('can add a custom menu by scripting API', async ({
    page
  }, { project }) => {



    // Skip test for mobile device
    if(project.name === "mobilechromium") {
      //eslint-disable-next-line playwright/no-skipped-test
      test.skip();
      return;
    }

    await page.goto(
        publicTestMapUrl("tests/E2E/empty.json", "iframe_script")
    );

    await login(page, 'Alice', 2, 'en-US', project.name === "mobilechromium");

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
   */

  test("base room properties", async ({ page }, { project }) => {
    // Skip test for mobile device
    if (project.name === "mobilechromium") {
      //eslint-disable-next-line playwright/no-skipped-test
      test.skip();
      return;
    }

    await page.goto(
      publicTestMapUrl("tests/E2E/empty.json", "iframe_script") + "#foo=bar"
    );

    await login(page, 'Alice', 2, 'en-US');

    const parameter = await evaluateScript(page, async () => {
      await WA.onInit();

      return WA.room.hashParameters.foo;
    });

    expect(parameter).toEqual("bar");
  });

  test("disable and enable map editor", async ({ page }, { project }) => {
    // Skip test for mobile device
    if (project.name === "mobilechromium") {
      //eslint-disable-next-line playwright/no-skipped-test
      test.skip();
      return;
    }

    await page.goto(publicTestMapUrl("tests/E2E/empty.json", "iframe_script"));

    await login(page, 'Alice', 2, 'en-US');
    await oidcAdminTagLogin(page, false);

    // Create a script to evaluate function to disable map editor
    await evaluateScript(page, async () => {
      await WA.onInit();

      WA.controls.disableMapEditor();
    });

    await Menu.openMapMenu(page);

    // Check if the map editor is disabled
    await expect(
        page.getByText("Map editor")
      //await page.locator("#mapEditorIcon").isDisabled({ timeout: 10000 })
    ).toBeHidden();

    // Create a script to evaluate function to enable map editor
    await evaluateScript(page, async () => {
      await WA.onInit();

      WA.controls.restoreMapEditor();
    });

    // Check if the map editor is enabled
    await expect(
        page.getByText("Map editor")
    ).toBeVisible();

    await page.close();
  });

  test("test disable invite user button", async ({ page }, { project }) => {
    await page.goto(publicTestMapUrl("tests/E2E/empty.json", "iframe_script"));

    await page.evaluate(() => localStorage.setItem("debug", "*"));
    await login(page, "Alice", 3, "en-US");

    // Create a script to evaluate function to disable map editor
    await evaluateScript(page, async () => {
      await WA.onInit();

      WA.controls.disableInviteButton();
    });

    // Check if the screen sharing is disabled
    expect(
      await page.locator("#invite-btn").isHidden({ timeout: 10000 })
    ).toBeTruthy();

    // Create a script to evaluate function to enable map editor
    await evaluateScript(page, async () => {
      await WA.onInit();

      WA.controls.restoreInviteButton();
    });

    // Check if the screen sharing is enabled
    expect(
      await page.locator("#invite-btn").isVisible({ timeout: 10000 })
    ).toBeTruthy();

    await page.close();
  });

  test("test disable screen sharing", async ({ page, browser }, {project}) => {
    // This test does not depend on the browser. Let's only run it in Chromium.
    if (browser.browserType() !== chromium) {
      //eslint-disable-next-line playwright/no-skipped-test
      test.skip();
      return;
    }

    await page.goto(publicTestMapUrl("tests/E2E/empty.json", "iframe_script"));

    await page.evaluate(() => localStorage.setItem("debug", "*"));
    await login(page, "Alice", 3, "en-US");

    // Create a script to evaluate function to disable map editor
    await evaluateScript(page, async () => {
      await WA.onInit();

      WA.controls.disableScreenSharing();
    });

    // Second browser
    const newBrowser = await browser.newContext();
    const pageBob = await newBrowser.newPage();
    await pageBob.goto(
      publicTestMapUrl("tests/E2E/empty.json", "iframe_script")
    );
    await pageBob.evaluate(() => localStorage.setItem("debug", "*"));
    await login(pageBob, "Bob", 5, 'en-US');

    // Check if the screen sharing is disabled
    await expect(
        page.getByTestId("screenShareButton")
    ).toBeDisabled();

    // Create a script to evaluate function to enable map editor
    await evaluateScript(page, async () => {
      await WA.onInit();

      WA.controls.restoreScreenSharing();
    });

    // Check if the screen sharing is enabled
    await expect(
        page.getByTestId("screenShareButton")
    ).toBeEnabled();

    await pageBob.close();
    await newBrowser.close();
    await page.close();
  });

  test("test disable right click user button", async ({ page, browser }, {project}) => {
    // This test does not depend on the browser. Let's only run it in Chromium.
    if (browser.browserType() !== chromium) {
      //eslint-disable-next-line playwright/no-skipped-test
      test.skip();
      return;
    }

    await page.goto(publicTestMapUrl("tests/E2E/empty.json", "iframe_script"));

    await page.evaluate(() => localStorage.setItem("debug", "*"));
    await login(page, 'Alice', 3, 'en-US');

    // Right click to move the user
    await page.locator("canvas").click({
      button: "right",
      position: {
        x: 381,
        y: 121,
      },
    });

    // Create a script to evaluate function to disable map editor
    await evaluateScript(page, async () => {
      await WA.onInit();
      WA.controls.disableRightClick();
    });

    // Right click to move the user
    await page.locator("canvas").click({
      button: "right",
      position: {
        x: 246,
        y: 295,
      },
    });

    // Create a script to evaluate function to enable map editor
    await evaluateScript(page, async () => {
      await WA.onInit();
      WA.controls.restoreRightClick();
    });

    // TODO: check if the right click is enabled

    await page.close();
  });

  // TDODO: disable and restore wheel zoom
});
