import { expect, test } from "@playwright/test";
import Map from "./utils/map";
import { publicTestMapUrl } from "./utils/urls";
import chatUtils from "./utils/chat";
import { getPage } from "./utils/auth";
import {isMobile} from "./utils/isMobile";

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


test.describe("Send Message from User List @oidc @matrix @chat", () => {
  test("Send Message from User List @oidc @matrix @chat", async ({ page, browser }, { project }) => {
    if (isMobile(page)) {
      //eslint-disable-next-line playwright/no-skipped-test
      test.skip();
    }

    const adminPage = await getPage(browser, "Admin1", publicTestMapUrl("tests/E2E/empty.json", "userlist"));

    const alicePosition = {
      x: 3 * 32,
      y: 4 * 32,
    };

    await Map.teleportToPosition(adminPage, alicePosition.x, alicePosition.y);

    const userBob = await getPage(browser, "Member1", publicTestMapUrl("tests/E2E/empty.json", "userlist"));

    //await Map.teleportToPosition(userBob, positionToDiscuss.x, positionToDiscuss.y);

    await chatUtils.open(userBob, false);
    await chatUtils.slideToUsers(userBob);
    await chatUtils.UL_sendMessage(userBob, "Admin1", "Hello Alice");

    await expect(userBob.getByTestId("roomName")).toHaveText(
      "John Doe"
    );

    await userBob.close();
    await adminPage.close();
  });

  test("Send Message from User List to user not connected @oidc @matrix @chat", async ({ browser }, { project }) => {
    // Alice is not connected
    const userAlice = await getPage(browser, 'Alice', Map.url("empty"));
    const alicePosition = {
      x: 4 * 32,
      y: 5 * 32,
    };
    await Map.teleportToPosition(userAlice, alicePosition.x, alicePosition.y);
    
    const userBob = await getPage(browser, 'Bob', Map.url("empty"));
    await chatUtils.open(userBob, false);
    await chatUtils.slideToUsers(userBob);
    // Click on chat button
    await userBob.getByTestId(`send-message-Alice`).click();

    // Check that the modal user not connected is opened
    await expect(userBob.getByText('User not connected 💬')).toBeVisible();
    // From the modal click on the button to walk to the user
    await userBob.getByRole('button', { name: 'Call Alice' }).click();

    // Check that the user is in bubble discussion to see the media's action button
    await expect(userBob.locator('#cameras-container .camera-box .video-media-box .user-menu-btn')).toBeVisible({timeout: 30_000});
  });
});