import { expect, test } from "@playwright/test";
import { resetWamMaps } from "../utils/map-editor/uploader";
import Map from "../utils/map";
import { login } from "../utils/roles";
import { oidcMatrixUserLogin } from "../utils/oidc";
import ChatUtils from "./chatUtils";

test.setTimeout(120000);

test.describe("Matrix chat tests @oidc @matrix", () => {
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


  //TODO : rename
  test("Create a public chat room", async ({ page }, { project }) => {
    const isMobile = project.name === "mobilechromium";
    await login(page, "test", 3, "us-US", isMobile);
    await oidcMatrixUserLogin(page, isMobile);
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

    await expect(page.getByTestId("@john.doe:matrix.workadventure.localhost-participant")).toBeAttached();

    await expect(page.getByTestId("@john.doe:matrix.workadventure.localhost-participant").getByTestId("@john.doe:matrix.workadventure.localhost-permissionLevel")).toHaveText("Admin");
    await expect(page.getByTestId("@john.doe:matrix.workadventure.localhost-participant").getByTestId("@john.doe:matrix.workadventure.localhost-membership")).toHaveText("Joined");

  });

  //TODO : rename
  test("Send messages in public chat room", async ({ page }, { project }) => {
    const isMobile = project.name === "mobilechromium";
    await login(page, "test", 3, "us-US", isMobile);
    await oidcMatrixUserLogin(page, isMobile);
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

    await expect(page.getByTestId("@john.doe:matrix.workadventure.localhost-participant")).toBeAttached();

    

  });

});

/**
 * TODO : 
 *  -   Tester creation de room ==> on est bien admin
 *  -   Tester creation de room ==> invitation de user ===> envoi de message l'admin ou modérateur peut supprimer
 *  -   Tester creation de room ==> passer un user en modérateur voir si il peut supprimer les messages des autres
 *  - Tester bannir unban de l'interface de moderation
 *  - Tester inviter après avoir banni un user
 *  - Tester les kicks 
 *  - voir l'affichage qu'on a après les actions surtout sur les badge de membership et de role
 */