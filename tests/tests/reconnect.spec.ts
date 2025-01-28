import { expect, test } from "@playwright/test";
import { publicTestMapUrl } from "./utils/urls";
import Map from "./utils/map";
import Menu from "./utils/menu";
import { getPage } from "./utils/auth"
import {isMobile} from "./utils/isMobile";

test.setTimeout(180_000);
test.describe("Connection", () => {
  test.beforeEach(async ({ page, browserName }) => {
    if (isMobile(page) || browserName === "webkit") {
      //eslint-disable-next-line playwright/no-skipped-test
      test.skip();
    }
  });
  test("can succeed even if WorkAdventure starts while pusher is down @slow",
      async ({ browser }) => {
    const page = await getPage(browser, 'Alice', publicTestMapUrl("tests/mousewheel.json", "reconnect"));

    //Simulation of offline network
    await page.context().setOffline(true);

    await expect(page.getByText("Connection lost")).toBeVisible({
        timeout: 180_000,
    });

    //Reconnect
    await page.context().setOffline(false);

    await Menu.waitForMapLoad(page, 180_000);
    /*await expect(page.locator("button#menuIcon")).toBeVisible({
      timeout: 180_000,
    });*/
    await page.close();
    await page.context().close();
  });

  test("can succeed on WAM file even if WorkAdventure starts while pusher is down @slow",
      async ({ browser }) => {
    const page = await getPage(browser, 'Alice', Map.url("empty"));

    //Simulation of offline network
    await page.context().setOffline(true);

    await expect(page.getByText("Unable to connect to WorkAdventure")).toBeVisible({
      timeout: 180_000,
    });

    //Reconnect
    await page.context().setOffline(false);

    await Menu.waitForMapLoad(page, 180_000);
    await page.close();
    await page.context().close();
  });
});
