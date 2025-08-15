import { expect, test } from "@playwright/test";
import { resetWamMaps } from "../utils/map-editor/uploader";
import Map from "../utils/map";
import { oidcMatrixUserLogin } from "../utils/oidc";
import {getPage} from "../utils/auth";
import ChatUtils from "./chatUtils";
import matrixApi from "./matrixApi";

test.setTimeout(120000);

test.describe("chat moderation @matrix", () => {
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
      await ChatUtils.resetMatrixDatabase();
    }
  );

  test.afterAll("reset matrix database", async () => {
    await ChatUtils.resetMatrixDatabase();
  });

  test("should create a public chat room and verify admin permissions",
      async ({ browser }) => {
    const page = await getPage(browser, 'Alice', Map.url("empty"));
    await oidcMatrixUserLogin(page);
    await ChatUtils.openChat(page);
    await ChatUtils.openCreateRoomDialog(page);
    const publicChatRoomName = ChatUtils.getRandomName();
    await page.getByTestId("createRoomName").fill(publicChatRoomName);
    await page.getByTestId("createRoomButton").click();

    await expect(page.getByText(publicChatRoomName)).toBeAttached();

    await expect(page.getByTestId(publicChatRoomName).getByTestId("toggleRoomMenu")).toBeAttached(); 

    await page.getByTestId(publicChatRoomName).hover();
    await page.getByTestId(publicChatRoomName).getByTestId("toggleRoomMenu").click();

    await page.getByTestId(publicChatRoomName).getByTestId("manageParticipantOption").click();

    await expect(page.getByTestId("@bob.doe:matrix.workadventure.localhost-participant")).toBeAttached();

    await expect(page.getByTestId("@bob.doe:matrix.workadventure.localhost-participant").getByTestId("@bob.doe:matrix.workadventure.localhost-permissionLevel")).toHaveText("Admin");
    await expect(page.getByTestId("@bob.doe:matrix.workadventure.localhost-participant").getByTestId("@bob.doe:matrix.workadventure.localhost-membership")).toHaveText("Joined");

    await page.close();
    await page.context().close();
  });

  test("should manage participants and permissions in public chat room",
      async ({ browser }, testInfo) => {

    if (testInfo.project.name === "mobilefirefox") {
      test.skip();
    }

    const page = await getPage(browser, 'Alice', Map.url("empty"));
    await oidcMatrixUserLogin(page);
    await ChatUtils.openChat(page);
    await ChatUtils.openCreateRoomDialog(page);
    const publicChatRoomName = ChatUtils.getRandomName();
    await page.getByTestId("createRoomName").fill(publicChatRoomName);
    await page.getByTestId("createRoomButton").click();

    await matrixApi.overrideRateLimitForUser('@bob.doe:matrix.workadventure.localhost');

    await expect(page.getByText(publicChatRoomName)).toBeAttached();

    await expect(page.getByTestId(publicChatRoomName).getByTestId("toggleRoomMenu")).toBeAttached(); 

    await page.getByTestId(publicChatRoomName).hover();
    await page.getByTestId(publicChatRoomName).getByTestId("toggleRoomMenu").click();

    await page.getByTestId(publicChatRoomName).getByTestId("manageParticipantOption").click();

    await expect(page.getByTestId("@bob.doe:matrix.workadventure.localhost-participant")).toBeAttached();

    await expect(page.getByTestId("inviteParticipantsModalContent").getByPlaceholder("Users")).toBeAttached();

    await page.getByTestId("inviteParticipantsModalContent").getByPlaceholder("Users").fill("@admin:matrix.workadventure.localhost");

    await page.getByTestId("inviteParticipantsModalContent").getByText("@admin:matrix.workadventure.localhost (@admin:matrix.workadventure.localhost)").click();

    await page.getByTestId("createRoomButton").click();
    await page.getByTestId("inviteParticipantsModalContent").locator(".clear-select" ).click();
    await expect(page.getByTestId("@admin:matrix.workadventure.localhost-kickButton")).toBeAttached();
    await expect(page.getByTestId("@admin:matrix.workadventure.localhost-banButton")).toBeAttached();
    await expect(page.getByTestId("@admin:matrix.workadventure.localhost-membership")).toHaveText("Invited");
   
    await page.getByTestId("@admin:matrix.workadventure.localhost-banButton").click();

    await expect(page.getByTestId("@admin:matrix.workadventure.localhost-membership")).toHaveText("Banned");
    await expect(page.getByTestId("@admin:matrix.workadventure.localhost-unbanButton")).toBeAttached();

    await page.getByTestId("@admin:matrix.workadventure.localhost-unbanButton").click();

    await expect(page.getByTestId("@admin:matrix.workadventure.localhost-membership")).toHaveText("Leaved");
    await expect(page.getByTestId("@admin:matrix.workadventure.localhost-inviteButton")).toBeAttached();
    await page.getByTestId("@admin:matrix.workadventure.localhost-inviteButton").click();

    await matrixApi.acceptAllInvitations(publicChatRoomName);
   
    await expect(page.getByTestId("@admin:matrix.workadventure.localhost-membership")).toHaveText("Joined");

    await expect(page.getByTestId("@admin:matrix.workadventure.localhost-kickButton")).toBeAttached();
    await expect(page.getByTestId("@admin:matrix.workadventure.localhost-banButton")).toBeAttached();

    await expect(page.getByTestId("@admin:matrix.workadventure.localhost-permissionLevel")).toBeEnabled();
    
    await page.getByTestId("@admin:matrix.workadventure.localhost-permissionLevel").selectOption("MODERATOR");

    // Wait for power level update to be reflected in the Matrix API
    // eslint-disable-next-line playwright/no-wait-for-timeout
    await page.waitForTimeout(1000);

    const powerLevel = await matrixApi.getMemberPowerLevel(publicChatRoomName);

    expect(powerLevel).toBe(50);

    await page.close();
    await page.context().close();
  });
});