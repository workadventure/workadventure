import { expect, test } from "@playwright/test";
import Map from "./utils/map";
import { publicTestMapUrl } from "./utils/urls";
import chatUtils from "./utils/chat";
import { getPage } from "./utils/auth";
import {getDevices} from "./utils/devices";

test.describe("Walk to", () => {
  test.beforeEach(async ({ page, browserName }) => {
    if (browserName === "webkit" || getDevices(page)) {
      //eslint-disable-next-line playwright/no-skipped-test
      test.skip();
    }
  });
  test("walk to a user ", async ({ browser }, { project }) => {
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
