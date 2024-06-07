import { expect, test } from "@playwright/test";
import { resetWamMaps } from "../utils/map-editor/uploader";
import Map from "../utils/map";
import { login } from "../utils/roles";
import { oidcAdminTagLogin } from "../utils/oidc";
import ChatUtils from "./chatUtils";

test.describe("Matrix chat tests @oidc", () => {
  test.beforeEach(
    "Ignore tests on webkit because of issue with camera and microphone",

    async ({ browserName, request, page }) => {
      //WebKit has issue with camera
      if (browserName === "webkit") {
        //eslint-disable-next-line playwright/no-skipped-test
        test.skip();
        return;
      }
      await resetWamMaps(request);
      await page.goto(Map.url("empty"));
    }
  );

  test("Open matrix Chat", async ({ page }) => {
    await login(page, "test", 3);
    await oidcAdminTagLogin(page);
    await ChatUtils.openChat(page);

    await expect(page.getByTestId("chat")).toBeAttached();
  });

  test("Create a public chat room", async ({ page }) => {
    await login(page, "test", 3);
    await oidcAdminTagLogin(page);
    await ChatUtils.openChat(page);
    await ChatUtils.openCreateRoomDialog(page);
    const publicChatRoomName = ChatUtils.getRandomName();
    await page.getByTestId("createRoomName").fill(publicChatRoomName);
    await page.getByTestId("createRoomButton").click();
    await expect(page.getByText(publicChatRoomName)).toBeAttached();
  });

  test("Send messages in public chat room", async ({ page }) => {
    await login(page, "test", 3);
    await oidcAdminTagLogin(page);
    await ChatUtils.openChat(page);
    await ChatUtils.openCreateRoomDialog(page);
    const publicChatRoomName = ChatUtils.getRandomName();
    await page.getByTestId("createRoomName").fill(publicChatRoomName);
    await page.getByTestId("createRoomButton").click();
    await page.getByText(publicChatRoomName).click();
    const chatMessageContent = "This is a test message";
    await page.getByTestId("messageInput").fill(chatMessageContent);
    await page.getByTestId("sendMessageButton").click();
    await expect(page.getByText(chatMessageContent)).toBeAttached();
  });
});
