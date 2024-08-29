import { expect, test } from "@playwright/test";
import { v4 as uuid } from "uuid";
import { publicTestMapUrl } from "./utils/urls";
import { login } from "./utils/roles";

test.setTimeout(180_000);
test.describe("Connection", () => {
  test("can succeed even if WorkAdventure starts while pusher is down", async ({
    page,
    context,
  }, { project }) => {
    // Skip test for mobile device
    if (project.name === "mobilechromium" || project.name === "webkit") {
      //eslint-disable-next-line playwright/no-skipped-test
      test.skip();
      return;
    }

    await page.goto(publicTestMapUrl("tests/mousewheel.json", uuid()));

    //Simulation of offline network
    await context.setOffline(true);

    expect(page.getByText("NETWORK ERROR")).toBeDefined();

    //Reconnect
    await context.setOffline(false);

    await login(page, 'Alice', 2, 'en-US', project.name === "mobilechromium");

    await expect(page.locator("button#menuIcon")).toBeVisible({
      timeout: 180_000,
    });
  });
});
