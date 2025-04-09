import { chromium, expect, test } from "@playwright/test";
import { evaluateScript } from "./utils/scripting";
import { publicTestMapUrl } from "./utils/urls";
import Menu from "./utils/menu";
import { getPage } from "./utils/auth";
import {isMobile} from "./utils/isMobile";
import Map from "./utils/map";

test.describe("Iframe API", () => {
  test.beforeEach(async ({ page }) => {
    if (isMobile(page)) {
      //eslint-disable-next-line playwright/no-skipped-test
      test.skip();
      return;
    }
  });
  test("can be called from an iframe loading a script", async ({ browser }) => {
    const page = await getPage(browser, 'Alice', 
      publicTestMapUrl("tests/Metadata/cowebsiteAllowApi.json", "iframe_script")
    );

    await expect(page.getByText('The iframe opened by a script')).toBeVisible();
    await page.close();
    await page.context().close();
  });

  test("base room properties", async ({ browser }) => {
    const page = await getPage(browser, 'Alice',
      publicTestMapUrl("tests/E2E/empty.json", "iframe_script") + "#foo=bar"
    );

    const parameter = await evaluateScript(page, async () => {
      await WA.onInit();

      return WA.room.hashParameters.foo;
    });

    expect(parameter).toEqual("bar");
    await page.close();
  });

  test("disable and enable map editor @oidc", async ({ browser }) => {
    const page = await getPage(browser, 'Admin1', Map.url("empty"));

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
    await page.context().close();
  });

  test("test disable invite user button", async ({ browser }) => {
    const page = await getPage(browser, 'Alice',
      publicTestMapUrl("tests/E2E/empty.json", "iframe_script")
    );
    await page.evaluate(() => localStorage.setItem("debug", "*"));
    
    // Create a script to evaluate function to disable map editor
    await evaluateScript(page, async () => {
      await WA.onInit();

      WA.controls.disableInviteButton();
    });

    // Check if the screen sharing is disabled
    await expect(page.getByRole('button', { name: 'Invite' })).toBeHidden();

    // Create a script to evaluate function to enable map editor
    await evaluateScript(page, async () => {
      await WA.onInit();

      WA.controls.restoreInviteButton();
    });

    // Check if the screen sharing is enabled
    await expect(page.getByRole('button', { name: 'Invite' })).toBeVisible();

    await page.close();
    await page.context().close();
  });

  test("test disable screen sharing", async ({ browser }) => {
    // This test does not depend on the browser. Let's only run it in Chromium.
    if (browser.browserType() !== chromium) {
      //eslint-disable-next-line playwright/no-skipped-test
      test.skip();
      return;
    }
    const page = await getPage(browser, 'Alice',
      publicTestMapUrl("tests/E2E/empty.json", "iframe_script")
    );
    await page.evaluate(() => localStorage.setItem("debug", "*"));

    // Create a script to evaluate function to disable map editor
    await evaluateScript(page, async () => {
      await WA.onInit();

      WA.controls.disableScreenSharing();
    });

    // Second browser
    const pageBob = await getPage(browser, 'Bob',
      publicTestMapUrl("tests/E2E/empty.json", "iframe_script")
    )
    await pageBob.evaluate(() => localStorage.setItem("debug", "*"));

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
    await pageBob.context().close();
    await page.close();
    await page.context().close();
  });

  test("test disable right click user button", async ({ browser }) => {
    // This test does not depend on the browser. Let's only run it in Chromium.
    if (browser.browserType() !== chromium) {
      //eslint-disable-next-line playwright/no-skipped-test
      test.skip();
      return;
    }
    const page = await getPage(browser, 'Alice',
      publicTestMapUrl("tests/E2E/empty.json", "iframe_script")
    );
    await page.evaluate(() => localStorage.setItem("debug", "*"));
    
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
    await page.context().close();
  });
  // TODO: disable and restore wheel zoom
});
