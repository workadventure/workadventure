import { expect, test } from "@playwright/test";
import Map from "./utils/map";
import { publicTestMapUrl } from "./utils/urls";
import chatUtils from "./utils/chat";
import { getPage } from "./utils/auth";
import {isMobile} from "./utils/isMobile";

test.describe("Walk to @nomobile @nowebkit", () => {
  test.beforeEach(async ({ page, browserName }) => {
    test.skip(browserName === 'webkit' || isMobile(page), 'Skip on WebKit and mobile');
  });
  // FIXME: for some reason, this test fails in Helm. Find why
  test("walk to a user", async ({ browser }, { project }) => {
    await using page = await getPage(browser, "Alice", publicTestMapUrl("tests/E2E/empty.json", "userlist"));
    const alicePosition = {
      x: 4 * 32,
      y: 5 * 32,
    };
    await Map.teleportToPosition(page, alicePosition.x, alicePosition.y);

    await using userBob = await getPage(browser, "Bob", publicTestMapUrl("tests/E2E/empty.json", "userlist"));

    //await Map.teleportToPosition(userBob, positionToDiscuss.x, positionToDiscuss.y);
    await chatUtils.openUserList(userBob, false);
    await chatUtils.UL_walkTo(userBob, "Alice");

    await chatUtils.open(page, false);

    await expect(page.getByTestId("roomName")).toHaveText(
      "Proximity Chat"
    );

    await expect(page.locator(".messageTextBody")).toContainText(
      "New discussion with Bob"
    );


    await userBob.context().close();
    await page.context().close();
  });
});


test.describe("Send Message from User List @oidc @matrix @chat", () => {
  test("Send Message from User List @oidc @matrix @chat @nomobile @nowebkit", async ({ page, browser, browserName }, { project }) => {
    test.skip(isMobile(page) || browserName === 'webkit', 'Skip on mobile and WebKit');

    await using adminPage = await getPage(browser, "Admin1", publicTestMapUrl("tests/E2E/empty.json", "userlist"));

    const alicePosition = {
      x: 3 * 32,
      y: 4 * 32,
    };

    await Map.teleportToPosition(adminPage, alicePosition.x, alicePosition.y);

    await using userBob = await getPage(browser, "Member1", publicTestMapUrl("tests/E2E/empty.json", "userlist"));

    //await Map.teleportToPosition(userBob, positionToDiscuss.x, positionToDiscuss.y);

    await chatUtils.open(userBob, false);
    await chatUtils.slideToUsers(userBob);
    await chatUtils.UL_sendMessage(userBob, "Admin1");

    await expect(userBob.getByTestId("roomName")).toHaveText(
      "John Doe"
    );
    await adminPage.context().close();
  });

  test("Send Message from User List to user not connected @oidc @matrix @chat @nomobile @nowebkit", async ({ page, browser, browserName }, { project }) => {
    test.skip(isMobile(page) || browserName === 'webkit', 'Skip on mobile or WebKit');

    // Alice is not connected
    await using userAlice = await getPage(browser, 'Alice', Map.url("empty"));
    const alicePosition = {
      x: 4 * 32,
      y: 5 * 32,
    };
    await Map.teleportToPosition(userAlice, alicePosition.x, alicePosition.y);
    
    await using userUserLogin1 = await getPage(browser, 'Member1', Map.url("empty"));
    await chatUtils.open(userUserLogin1, false);
    await chatUtils.slideToUsers(userUserLogin1);
    // Click on chat button
    await expect(userUserLogin1.getByTestId(`send-message-Alice`)).toBeDisabled();

    await userAlice.context().close();
    await userUserLogin1.context().close();
  });
});
