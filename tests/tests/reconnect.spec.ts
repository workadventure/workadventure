import { expect, test } from "@playwright/test";
import { publicTestMapUrl } from "./utils/urls";
import { login } from "./utils/roles";
import Map from "./utils/map";
import Menu from "./utils/menu";

test.setTimeout(180_000);
test.describe("Connection", () => {
  test("can succeed even if WorkAdventure starts while pusher is down @slow", async ({
    page,
    context,
  }, { project }) => {
    // Skip test for mobile device
    if (project.name === "mobilechromium" || project.name === "webkit") {
      //eslint-disable-next-line playwright/no-skipped-test
      test.skip();
      return;
    }

    await page.goto(publicTestMapUrl("tests/mousewheel.json", "reconnect"));

    await login(page, 'Alice', 2, 'en-US');

    //Simulation of offline network
    await context.setOffline(true);

    await expect(page.getByText("Connection lost")).toBeVisible({
        timeout: 180_000,
    });

    //Reconnect
    await context.setOffline(false);


    await Menu.waitForMapMenu(page, 180_000);
    /*await expect(page.locator("button#menuIcon")).toBeVisible({
      timeout: 180_000,
    });*/
  });

  test("can succeed on WAM file even if WorkAdventure starts while pusher is down @slow", async ({
                                                                                 page,
                                                                                 context,
                                                                               }, { project }) => {
    // Skip test for mobile device
    if (project.name === "mobilechromium" || project.name === "webkit") {
      //eslint-disable-next-line playwright/no-skipped-test
      test.skip();
      return;
    }

    await page.goto(Map.url("empty"));

    await login(page, 'Alice', 2, 'en-US');

    //Simulation of offline network
    await context.setOffline(true);

    await expect(page.getByText("Unable to connect to WorkAdventure")).toBeVisible({
      timeout: 180_000,
    });

    //Reconnect
    await context.setOffline(false);

    await Menu.waitForMapMenu(page, 180_000);
    /*await expect(page.locator("button#menuIcon")).toBeVisible({
      timeout: 180_000,
    });*/
  });
});
