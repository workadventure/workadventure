import { expect, test } from "@playwright/test";
import Map from "./utils/map";
import { publicTestMapUrl } from "./utils/urls";
import chatUtils from "./utils/chat";
import { getPage } from "./utils/auth";
import {isMobile} from "./utils/isMobile";
import { oidcAdminTagLogin, oidcMemberTagLogin } from "./utils/oidc";

test.describe("Walk to", () => {
  test.beforeEach(async ({ page, browserName }) => {
    if (browserName === "webkit" || isMobile(page)) {
      //eslint-disable-next-line playwright/no-skipped-test
      test.skip();
    }
  });
  // FIXME: for some reason, this test fails in Helm. Find why
  test("walk to a user", async ({ browser }, { project }) => {
    const page = await getPage(browser, "Alice", publicTestMapUrl("tests/E2E/empty.json", "userlist"));
    const alicePosition = {
      x: 4 * 32,
      y: 5 * 32,
    };
    await Map.teleportToPosition(page, alicePosition.x, alicePosition.y);

    const userBob = await getPage(browser, "Bob", publicTestMapUrl("tests/E2E/empty.json", "userlist"));

    //await Map.teleportToPosition(userBob, positionToDiscuss.x, positionToDiscuss.y);
    await chatUtils.openUserList(userBob, false);
    await chatUtils.UL_walkTo(userBob, "Alice");

    await chatUtils.open(page, false);

    await expect(page.getByTestId("roomName")).toHaveText(
      "Proximity Chat"
    );

    await expect(page.locator(".messageTextBody")).toContainText(
      "Bob joined the discussion"
    );

    await userBob.close();
    await userBob.context().close();
    await page.close();
    await page.context().close();
  });
});


test.describe("Send Message from User List", () => {
  test("Send Message from User List", async ({ page, browser }, { project }) => {
    if (project.name === "mobilechromium") {
      //eslint-disable-next-line playwright/no-skipped-test
      test.skip();
      return;
    }

    const isMobileTest = project.name === "mobilechromium";
    await page.goto(publicTestMapUrl("tests/E2E/empty.json", "userlist"));

    await login(page, "Alice", 2, "en-US", isMobileTest);
    await oidcAdminTagLogin(page);

    const alicePosition = {
      x: 3 * 32,
      y: 4 * 32,
    };

    await Map.teleportToPosition(page, alicePosition.x, alicePosition.y);

    const newBrowser = await browser.newContext();
    const userBob = await newBrowser.newPage();

    await userBob.goto(publicTestMapUrl("tests/E2E/empty.json", "userlist"));
    // Login user "Bob"
    await login(userBob, "Bob", 3, "en-US", isMobileTest);
    await oidcMemberTagLogin(userBob);
    //await Map.teleportToPosition(userBob, positionToDiscuss.x, positionToDiscuss.y);

    await chatUtils.open(userBob, false);
    await chatUtils.slideToUsers(userBob);
    await chatUtils.UL_sendMessage(userBob, "Alice", "Hello Alice");

    await expect(userBob.getByTestId("roomName")).toHaveText(
      "John Doe"
    );

    await userBob.close();
    await newBrowser.close();
  });
});