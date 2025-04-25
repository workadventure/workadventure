import { expect, test } from "@playwright/test";
import { resetWamMaps } from "../utils/map-editor/uploader";
import Map from "../utils/map";
import { oidcLogout, oidcMatrixUserLogin } from "../utils/oidc";
import { getPage} from "../utils/auth";
import {isMobile} from "../utils/isMobile";
import Menu from "../utils/menu";
import ChatUtils from "./chatUtils";

test.setTimeout(120000);

test.describe("Matrix chat tests @oidc @matrix", () => {
  test.beforeEach(
    "Ignore tests on webkit because of issue with camera and microphone",

    async ({ request, browserName }) => {
      //WebKit has issue with camera
      if (browserName === "webkit") {
        //eslint-disable-next-line playwright/no-skipped-test
        test.skip();
        return;
      }
      await resetWamMaps(request);
      await ChatUtils.resetMatrixDatabase();
    }
  );

  test.afterAll("reset matrix database", async () => {
    await ChatUtils.resetMatrixDatabase();
  });

  test("Open matrix Chat", async ({ browser }) => {
    const page = await getPage(browser, 'Alice', Map.url("empty"));

    await oidcMatrixUserLogin(page);
    await ChatUtils.openChat(page);
    await expect(page.getByTestId("chat")).toBeAttached();
    await page.close();
    await page.context().close();
  });
  test("Create a public chat room", async ({ browser }) => {
    const page = await getPage(browser, 'Alice', Map.url("empty"));
    await oidcMatrixUserLogin(page);
    await ChatUtils.openChat(page);
    await ChatUtils.openCreateRoomDialog(page);
    const publicChatRoomName = ChatUtils.getRandomName();
    await page.getByTestId("createRoomName").fill(publicChatRoomName);
    await page.getByTestId("createRoomButton").click();
    await expect(page.getByText(publicChatRoomName)).toBeAttached();
    await page.close();
    await page.context().close();
  });
  test("Send messages in public chat room", async ({ browser }) => {
    const page = await getPage(browser, 'Alice', Map.url("empty"));
    await oidcMatrixUserLogin(page);
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
    await page.close();
    await page.context().close();
  });
  test("Send application messages in public chat room", async ({ browser }) => {
    const page = await getPage(browser, 'Alice', Map.url("empty"));
    await oidcMatrixUserLogin(page);
    await ChatUtils.openChat(page);
    await ChatUtils.openCreateRoomDialog(page);
    const publicChatRoomName = ChatUtils.getRandomName();
    await page.getByTestId("createRoomName").fill(publicChatRoomName);
    await page.getByTestId("createRoomButton").click();
    await page.getByText(publicChatRoomName).click();
    const chatMessageContent = "This is a test message";
    await page.getByTestId("messageInput").click();
    await page.getByTestId("messageInput").fill(chatMessageContent);
    await page.getByTestId("sendMessageButton").click();
    await expect(page.getByText(chatMessageContent)).toBeAttached();
    await page.close();
    await page.context().close();
  });
  test("Send application messages and youtube link in public chat room", async ({ browser }) => {
    const page = await getPage(browser, 'Alice', Map.url("empty"));
    await oidcMatrixUserLogin(page);
    await ChatUtils.openChat(page);
    await ChatUtils.openCreateRoomDialog(page);
    const publicChatRoomName = ChatUtils.getRandomName();
    await page.getByTestId("createRoomName").fill(publicChatRoomName);
    await page.getByTestId("createRoomButton").click();
    await page.getByText(publicChatRoomName).click();

    // Add an application
    await page.getByTestId("addApplicationButton").click();

    // Check that all applications are displayed
    await expect(page.getByTestId("youtubeApplicationButton")).toBeAttached();
    await expect(page.getByTestId("klaxoonApplicationButton")).toBeAttached();
    await expect(page.getByTestId("googleSheetsApplicationButton")).toBeAttached();
    await expect(page.getByTestId("googleSlidesApplicationButton")).toBeAttached();
    await expect(page.getByTestId("googleDocsApplicationButton")).toBeAttached();
    await expect(page.getByTestId("googleDriveApplicationButton")).toBeAttached();
    await expect(page.getByTestId("eraserApplicationButton")).toBeAttached();
    await expect(page.getByTestId("excalidrawApplicationButton")).toBeAttached();
    await expect(page.getByTestId("cardsApplicationButton")).toBeAttached();

    // Add Youtube application
    await page.getByTestId("youtubeApplicationButton").click();

    // Enter the link
    await page.getByTestId("applicationInputLink").click();
    await page.getByTestId("applicationInputLink").fill("test");
    await page.getByTestId("applicationInputLink").press("Enter");

    // check that the error is displayed
    await expect(page.getByTestId("applicationLinkError")).toBeAttached();

    // Enter the true link
    await page.getByTestId("applicationInputLink").click();
    await page.getByTestId("applicationInputLink").fill("https://www.youtube.com/watch?v=6ZfuNTqbHE8");
    await page.getByTestId("applicationInputLink").press("Enter");

    // check that the error is not displayed
    await expect(page.getByTestId("applicationLinkError")).not.toBeAttached();

    const chatMessageContent = "This is a test message";
    await page.getByTestId("messageInput").click();
    await page.getByTestId("messageInput").fill(chatMessageContent);
    await page.getByTestId("sendMessageButton").click();

    // check that the link build for message is correct and the message is displayed
    await expect(page.getByText("https://www.youtube.com/embed/6ZfuNTqbHE8?feature=oembed")).toBeAttached();
    // check that the message is displayed
    await expect(page.getByText(chatMessageContent)).toBeAttached();
    await page.close();
    await page.context().close();
  });
  test("Send application messages and klaxoon link in public chat room", async ({ browser }) => {
    const page = await getPage(browser, 'Alice', Map.url("empty"));
    await oidcMatrixUserLogin(page);
    await ChatUtils.openChat(page);
    await ChatUtils.openCreateRoomDialog(page);
    const publicChatRoomName = ChatUtils.getRandomName();
    await page.getByTestId("createRoomName").fill(publicChatRoomName);
    await page.getByTestId("createRoomButton").click();
    await page.getByText(publicChatRoomName).click();

    // Add an application
    await page.getByTestId("addApplicationButton").click();

    // Check that all applications are displayed
    await expect(page.getByTestId("youtubeApplicationButton")).toBeAttached();
    await expect(page.getByTestId("klaxoonApplicationButton")).toBeAttached();
    await expect(page.getByTestId("googleSheetsApplicationButton")).toBeAttached();
    await expect(page.getByTestId("googleSlidesApplicationButton")).toBeAttached();
    await expect(page.getByTestId("googleDocsApplicationButton")).toBeAttached();
    await expect(page.getByTestId("googleDriveApplicationButton")).toBeAttached();
    await expect(page.getByTestId("eraserApplicationButton")).toBeAttached();
    await expect(page.getByTestId("excalidrawApplicationButton")).toBeAttached();
    await expect(page.getByTestId("cardsApplicationButton")).toBeAttached();

    // Add Youtube application
    await page.getByTestId("klaxoonApplicationButton").click();

    // check if the iframe activity picker is opened
    const popupPromise = page.waitForEvent("popup");
    await popupPromise;
    (await popupPromise).close();

    // Enter the link
    await page.getByTestId("applicationInputLink").click();
    await page.getByTestId("applicationInputLink").fill("test");
    await page.getByTestId("applicationInputLink").press("Enter");

    // check that the error is displayed
    await expect(page.getByTestId("applicationLinkError")).toBeAttached();

    // Enter the true link
    await page.getByTestId("applicationInputLink").click();
    await page.getByTestId("applicationInputLink").fill("https://app.klaxoon.com/join/KXEWMSE3NF2M");
    await page.getByTestId("applicationInputLink").press("Enter");

    // check that the error is not displayed
    await expect(page.getByTestId("applicationLinkError")).not.toBeAttached();

    const chatMessageContent = "This is a test message";
    await page.getByTestId("messageInput").click();
    await page.getByTestId("messageInput").fill(chatMessageContent);
    await page.getByTestId("sendMessageButton").click();

    // check that the link build for message is correct and the message is displayed
    await expect(page.getByRole('link', { name: 'https://app.klaxoon.com/join/KXEWMSE3NF2M' })).toBeVisible();
    //await expect(page.getByText("https://app.klaxoon.com/join/KXEWMSE3NF2M?from=aG3stVtZnDmhrhqKc17to1OlfvyyEUeV")).toBeAttached();
    // check that the message is displayed
    await expect(page.getByText(chatMessageContent)).toBeAttached();
    await page.close();
    await page.context().close();
  });
  test("Reply to message", async ({ browser }) => {
    const page = await getPage(browser, 'Alice', Map.url("empty"));
    await oidcMatrixUserLogin(page);
    await ChatUtils.openChat(page);
    await ChatUtils.openCreateRoomDialog(page);
    const publicChatRoomName = ChatUtils.getRandomName();
    await page.getByTestId("createRoomName").fill(publicChatRoomName);
    await page.getByTestId("createRoomButton").click();
    await page.getByText(publicChatRoomName).click();
    const chatMessageContent = "This is a test message";
    await page.getByTestId("messageInput").fill(chatMessageContent);
    await page.getByTestId("sendMessageButton").click();
    await page.getByText(chatMessageContent).hover();
    await page.getByTestId("replyToMessageButton").click();
    await page.getByTestId("messageInput").fill("Sample response");
    await page.getByTestId("sendMessageButton").click();
    await expect(page.getByText(chatMessageContent)).toHaveCount(2);
    await page.close();
    await page.context().close();
  });

  test("React to message and remove reaction to message", async ({ browser }) => {
    const page = await getPage(browser, 'Alice', Map.url("empty"));
    await oidcMatrixUserLogin(page);
    await ChatUtils.openChat(page);
    await ChatUtils.openCreateRoomDialog(page);
    const publicChatRoomName = ChatUtils.getRandomName();
    await page.getByTestId("createRoomName").fill(publicChatRoomName);
    await page.getByTestId("createRoomButton").click();
    await page.getByText(publicChatRoomName).click();
    const chatMessageContent = "This is a test message";
    await page.getByTestId("messageInput").fill(chatMessageContent);
    await page.getByTestId("sendMessageButton").click();
    await page.getByText(chatMessageContent).hover();
    await page.getByTestId("openEmojiPickerButton").click();
    await page.getByLabel('😀, grinning face, grinning,').click();
    await expect(page.locator('.reactions-bar').getByText('😀')).toBeVisible();
    await page.locator('.reactions-bar').getByText('😀').click();
    await expect(
        page.locator('.reactions-bar').getByText('😀')
    ).toBeHidden();
    await page.close();
    await page.context().close();
  });

  test("Remove message", async ({ browser }) => {
    const page = await getPage(browser, 'Alice', Map.url("empty"));
    await oidcMatrixUserLogin(page);
    await ChatUtils.openChat(page);
    await ChatUtils.openCreateRoomDialog(page);
    const publicChatRoomName = ChatUtils.getRandomName();
    await page.getByTestId("createRoomName").fill(publicChatRoomName);
    await page.getByTestId("createRoomButton").click();
    await page.getByText(publicChatRoomName).click();
    const chatMessageContent = "This is a test message";
    await page.getByTestId("messageInput").fill(chatMessageContent);
    await page.getByTestId("sendMessageButton").click();
    await page.getByText(chatMessageContent).hover();
    await page.getByTestId("removeMessageButton").click();
    await expect(page.getByText(chatMessageContent)).not.toBeAttached();
    await page.close();
    await page.context().close();
  });

  test("Edit message", async ({ browser }) => {
    const page = await getPage(browser, 'Alice', Map.url("empty"));
    await oidcMatrixUserLogin(page);
    await ChatUtils.openChat(page);
    await ChatUtils.openCreateRoomDialog(page);
    const publicChatRoomName = ChatUtils.getRandomName();
    await page.getByTestId("createRoomName").fill(publicChatRoomName);
    await page.getByTestId("createRoomButton").click();
    await page.getByText(publicChatRoomName).click();
    const chatMessageContent = "This is a test message";
    const chatMessageEdited = "This is a test edited message";
    await page.getByTestId("messageInput").fill(chatMessageContent);
    await page.getByTestId("sendMessageButton").click();
    await page.getByText(chatMessageContent).hover();
    await page.getByTestId("editMessageButton").click();
    await page.getByTestId("editMessageInput").fill(chatMessageEdited);
    await page.getByTestId("saveMessageEditionButton").click();
    await expect(page.getByText(chatMessageEdited)).toBeAttached();
    await expect(page.getByText(chatMessageContent)).not.toBeAttached();
    await page.close();
    await page.context().close();
  });

  test("Cancel edit message", async ({ browser }) => {
    const page = await getPage(browser, 'Alice', Map.url("empty"));
    await oidcMatrixUserLogin(page);
    await ChatUtils.openChat(page);
    await ChatUtils.openCreateRoomDialog(page);
    const publicChatRoomName = ChatUtils.getRandomName();
    await page.getByTestId("createRoomName").fill(publicChatRoomName);
    await page.getByTestId("createRoomButton").click();
    await page.getByText(publicChatRoomName).click();
    const chatMessageContent = "This is a test message";
    const chatMessageEdited = "This is a test edited message";
    await page.getByTestId("messageInput").fill(chatMessageContent);
    await page.getByTestId("sendMessageButton").click();
    await page.getByText(chatMessageContent).hover();
    await page.getByTestId("editMessageButton").click();
    await page.getByTestId("editMessageInput").fill(chatMessageEdited);
    await page.getByTestId("cancelMessageEditionButton").click();
    await expect(page.getByText(chatMessageEdited)).not.toBeAttached();
    await expect(page.getByText(chatMessageContent)).toBeAttached();
    await page.close();
    await page.context().close();
  });

  test("Create a private chat room", async ({ browser }) => {
    const page = await getPage(browser, 'Alice', Map.url("empty"));
    await oidcMatrixUserLogin(page);
    await ChatUtils.openChat(page);
    await ChatUtils.openCreateRoomDialog(page);
    const privateChatRoom = ChatUtils.getRandomName();
    await page.getByTestId("createRoomName").fill(privateChatRoom);
    await page.getByTestId("createRoomVisibility").selectOption("private");
    await page.getByTestId("createRoomButton").click();
    await expect(page.getByText(privateChatRoom)).toBeAttached();
    await page.close();
    await page.context().close();
  });

  test("Create a private encrypted chat room (new user)", async ({
    browser }) => {
    const page = await getPage(browser, 'Alice', Map.url("empty"));
    await oidcMatrixUserLogin(page);
    await ChatUtils.openChat(page);
    await ChatUtils.openCreateRoomDialog(page);
    const privateChatRoom = `Encrypted_${ChatUtils.getRandomName()}`;
    await page.getByTestId("createRoomName").fill(privateChatRoom);
    await page.getByTestId("createRoomVisibility").selectOption("private");
    await page.getByText('Activate end to end encryption').click();
    await page.getByTestId("createRoomEncryption").check();
    await page.getByTestId("createRoomButton").click();
    await ChatUtils.initEndToEndEncryption(privateChatRoom, page, page.context());
    await expect(page.getByText(privateChatRoom)).toBeAttached();
    await page.close();
    await page.context().close();
  });

  test("Send message in private chat room (new user)", async ({
    browser }) => {
    const page = await getPage(browser, 'Alice', Map.url("empty"));
    await oidcMatrixUserLogin(page);
    await ChatUtils.openChat(page);
    await ChatUtils.openCreateRoomDialog(page);
    const privateChatRoom = `Encrypted_${ChatUtils.getRandomName()}`;
    await page.getByTestId("createRoomName").fill(privateChatRoom);
    await page.getByTestId("createRoomVisibility").selectOption("private");
    await page.getByText('Activate end to end encryption').click();
    await page.getByTestId("createRoomEncryption").check();
    await page.getByTestId("createRoomButton").click();
    await ChatUtils.initEndToEndEncryption(privateChatRoom, page, page.context());
    await page.getByText(privateChatRoom).click();
    const chatMessageContent = "This is a test message";
    await page.getByTestId("messageInput").fill(chatMessageContent);
    await page.getByTestId("sendMessageButton").click();
    await expect(page.getByText(chatMessageContent)).toBeAttached();
    await page.close();
    await page.context().close();
  });

  test("Retrieve encrypted message", async ({ browser }) => {
    const page = await getPage(browser, 'Alice', Map.url("empty"));
    await oidcMatrixUserLogin(page);
    await ChatUtils.openChat(page);
    await ChatUtils.openCreateRoomDialog(page);
    const privateChatRoom = `Encrypted_${ChatUtils.getRandomName()}`;
    await page.getByTestId("createRoomName").fill(privateChatRoom);
    await page.getByTestId("createRoomVisibility").selectOption("private");
    await page.getByText('Activate end to end encryption').click();
    await page.getByTestId("createRoomEncryption").check();
    await page.getByTestId("createRoomButton").click();
    await ChatUtils.initEndToEndEncryption(privateChatRoom, page, page.context());
    await page.getByText(privateChatRoom).click();
    const chatMessageContent = "This is a test message";
    await page.getByTestId("messageInput").fill(chatMessageContent);

    //We need to wait for the room key to be uploaded
    const roomKeyBackupPromise = page.waitForResponse(
      (response) =>
        response.url().includes("keys?version") && response.status() === 200
    );
    await page.getByTestId("sendMessageButton").click();
    await roomKeyBackupPromise;

    //We need to wait for anonym login to prevent issue with logout/login fast processing
    const anonymLoginPromise = page.waitForResponse(
      (response) =>
        response.url().includes("anonymLogin") && response.status() === 200
    );
    if (isMobile(page)) {
      await ChatUtils.closeChat(page);
    }
    await oidcLogout(page);
    await anonymLoginPromise;
    await oidcMatrixUserLogin(page);
    await ChatUtils.openChat(page);
    await page.getByText(privateChatRoom).click();
    await ChatUtils.restoreEncryption(page);
    await expect(page.getByText(chatMessageContent)).toBeAttached();
    await page.close();
    await page.context().close();
  });

  test("Retrieve encrypted message after cancelling passphrase request", async ({
    browser }) => {
    const page = await getPage(browser, 'Alice', Map.url("empty"));
    await oidcMatrixUserLogin(page);
    await ChatUtils.openChat(page);
    await ChatUtils.openCreateRoomDialog(page);
    const privateChatRoom = `Encrypted_${ChatUtils.getRandomName()}`;
    await page.getByTestId("createRoomName").fill(privateChatRoom);
    await page.getByTestId("createRoomVisibility").selectOption("private");
    await page.getByText('Activate end to end encryption').click();
    await page.getByTestId("createRoomEncryption").check();
    await page.getByTestId("createRoomButton").click();
    await ChatUtils.initEndToEndEncryption(privateChatRoom, page, page.context());
    await page.getByText(privateChatRoom).click();
    const chatMessageContent = "This is a test message";
    await page.getByTestId("messageInput").fill(chatMessageContent);

    //We need to wait for the room key to be uploaded
    const roomKeyBackupPromise = page.waitForResponse(
      (response) =>
        response.url().includes("keys?version") && response.status() === 200
    );
    await page.getByTestId("sendMessageButton").click();
    await roomKeyBackupPromise;

    //We need to wait for anonym login to prevent issue with logout/login fast processing
    const anonymLoginPromise = page.waitForResponse(
      (response) =>
        response.url().includes("anonymLogin") && response.status() === 200
    );
    if (isMobile(page)) {
      await ChatUtils.closeChat(page);
    }
    await oidcLogout(page);
    await anonymLoginPromise;

    await oidcMatrixUserLogin(page);
    await ChatUtils.openChat(page);
    await page.getByText(privateChatRoom).click();
    //await page.getByTestId("VerifyWithPassphraseButton").click();
    await page.getByText("Cancel").click();
    await expect(page.getByText("Failed to decrypt")).toBeAttached();
    await page.getByTestId("chatBackward").click();
    await ChatUtils.restoreEncryptionFromButton(page);
    await page.getByText(privateChatRoom).click();
    await expect(page.getByText(chatMessageContent)).toBeAttached();
    await page.close();
    await page.context().close();
  });

  test("Key creation should stop after the SSO process is canceled", async ({
    browser }) => {
    const page = await getPage(browser, 'Alice', Map.url("empty"));
    await oidcMatrixUserLogin(page);
    await ChatUtils.openChat(page);
    await ChatUtils.openCreateRoomDialog(page);
    const privateChatRoom = `Encrypted_${ChatUtils.getRandomName()}`;
    await page.getByTestId("createRoomName").fill(privateChatRoom);
    await page.getByTestId("createRoomVisibility").selectOption("private");
    await page.getByText('Activate end to end encryption').click();
    await page.getByTestId("createRoomEncryption").check();
    await page.getByTestId("createRoomButton").click();
    await page.getByText(privateChatRoom).click();
    await ChatUtils.cancelledContinueWithSSO(page, page.context());
    await page.getByTestId("chatBackward").click();

    await expect(
      page.getByText("Chat recovery key creation")
    ).not.toBeAttached();
    await expect(page.getByText("Encryption not configured")).toBeAttached();
    await page.close();
    await page.context().close();
  });

  test("Create a public folder", async ({ browser }) => {
    const page = await getPage(browser, 'Alice', Map.url("empty"));
    await oidcMatrixUserLogin(page);
    await ChatUtils.openChat(page);
    await ChatUtils.openCreateFolderDialog(page);
    const publicFolder = ChatUtils.getRandomName();
    await page.getByTestId("createFolderName").fill(publicFolder);
    await page.getByTestId("createFolderVisibility").selectOption("public");
    await page.getByTestId("createFolderButton").click();
    await page.getByTestId("roomAccordeon").click();
    await expect(page.getByText(publicFolder)).toBeAttached();
    await page.close();
    await page.context().close();
  });

  test("Create a private folder", async ({ browser }) => {
    const page = await getPage(browser, 'Alice', Map.url("empty"));
    await oidcMatrixUserLogin(page);
    await ChatUtils.openChat(page);
    await ChatUtils.openCreateFolderDialog(page);
    const privateFolder = ChatUtils.getRandomName();
    await page.getByTestId("createFolderName").fill(privateFolder);
    await page.getByTestId("createFolderVisibility").selectOption("private");
    await page.getByTestId("createFolderButton").click();
    await page.getByTestId("roomAccordeon").click();
    await expect(page.getByText(privateFolder)).toBeAttached();
    await page.close();
    await page.context().close();
  });

  test("Create a nested folder", async ({ browser }) => {
    const page = await getPage(browser, 'Alice', Map.url("empty"));
    await oidcMatrixUserLogin(page);
    await ChatUtils.openChat(page);

    await ChatUtils.openCreateFolderDialog(page);
    const privateFolder1 = ChatUtils.getRandomName();
    await page.getByTestId("createFolderName").fill(privateFolder1);
    await page.getByTestId("createFolderVisibility").selectOption("private");
    await page.getByTestId("createFolderButton").click();
    await page.getByTestId("roomAccordeon").click();
    await expect(page.getByText(privateFolder1)).toBeAttached();

    const privateFolder2 = ChatUtils.getRandomName();
    await page.waitForTimeout(1000);
    await ChatUtils.openCreateFolderDialog(page, privateFolder1);
    await page.getByTestId("createFolderName").fill(privateFolder2);
    await page.getByTestId("createFolderVisibility").selectOption("private");
    await page.getByTestId("createFolderButton").click();


    await expect(page.getByText(privateFolder2)).toBeHidden({
      timeout: 60000,
    });
    await page.getByText(privateFolder1).click();
    await expect(page.getByText(privateFolder2)).toBeVisible();
    await page.close();
    await page.context().close();
  });

  test("Create a room in a folder", async ({ browser }) => {
    const page = await getPage(browser, 'Alice', Map.url("empty"));
    await oidcMatrixUserLogin(page);
    await ChatUtils.openChat(page);

    await ChatUtils.openCreateFolderDialog(page);
    const privateFolder1 = ChatUtils.getRandomName();
    await page.getByTestId("createFolderName").fill(privateFolder1);
    await page.getByTestId("createFolderVisibility").selectOption("private");
    await page.getByTestId("createFolderButton").click();
    await page.getByTestId("roomAccordeon").click();
    await expect(page.getByText(privateFolder1)).toBeAttached();

    const room = ChatUtils.getRandomName();
    await ChatUtils.openCreateRoomDialog(page, privateFolder1);
    await page.getByTestId("createRoomName").fill(room);
    await page.getByTestId("createRoomVisibility").selectOption("public");
    await page.getByTestId("createRoomButton").click();
    await page.waitForTimeout(1000);
    await page.getByText(privateFolder1).click();
    await expect(page.getByText(room)).toBeAttached();

    await page.close();
    await page.context().close();
  });

  test("Create a restricted room", async ({ browser }) => {
    const page = await getPage(browser, 'Alice', Map.url("empty"));
    await oidcMatrixUserLogin(page);
    await ChatUtils.openChat(page);

    await ChatUtils.openCreateFolderDialog(page);
    const privateFolder1 = ChatUtils.getRandomName();
    await page.getByTestId("createFolderName").fill(privateFolder1);
    await page.getByTestId("createFolderVisibility").selectOption("private");
    await page.getByTestId("createFolderButton").click();
    await page.getByTestId("roomAccordeon").click();
    await expect(page.getByText(privateFolder1)).toBeAttached();
    const room = ChatUtils.getRandomName();
    await ChatUtils.openCreateRoomDialog(page, privateFolder1);
    await page.getByTestId("createRoomName").fill(room);
    await page.getByTestId("createRoomVisibility").selectOption("restricted");
    await page.getByTestId("createRoomButton").click();
    await page.getByText(privateFolder1).click();
    await expect(page.getByText(room)).toBeAttached();
    await page.close();
    await page.context().close();
  });

  test("Verify a session with emoji", async ({ browser }) => {
    const page = await getPage(browser, 'Alice', Map.url("empty"));
    if (isMobile(page)) {
      await Menu.openMenu(page);
    }
    await oidcMatrixUserLogin(page);
    await ChatUtils.openChat(page);
    await ChatUtils.openCreateRoomDialog(page);
    const privateChatRoom = `Encrypted_${ChatUtils.getRandomName()}`;
    await page.getByTestId("createRoomName").fill(privateChatRoom);
    await page.getByTestId("createRoomVisibility").selectOption("private");
    await page.getByText('Activate end to end encryption').click();
    await page.getByTestId("createRoomEncryption").check();
    await page.getByTestId("createRoomButton").click();
    await ChatUtils.initEndToEndEncryption(privateChatRoom, page, page.context());

    const otherPage = await getPage(browser, 'Bob', Map.url("empty"));
    if (isMobile(otherPage)) {
      await Menu.openMenu(otherPage);
    }
    await oidcMatrixUserLogin(otherPage);
    await ChatUtils.openChat(otherPage);
    await otherPage.getByTestId('chatBackward').click();
    await otherPage.getByText(privateChatRoom).click();
    await otherPage.getByTestId("VerifyWithAnotherDeviceButton").click();

    await page.getByTestId("VerifyTheSessionButton").click();

    await page.getByTestId("matchButton").click();

    await otherPage.getByTestId("matchButton").click();

    await expect(page.getByTestId("understoodButton")).toBeAttached();

    await expect(otherPage.getByTestId("understoodButton")).toBeAttached();
    await otherPage.close();
    await otherPage.context().close();
    await page.close();
    await page.context().close();
  });

  test("Verify a session with emoji , one device click on mismatch button", async ({browser,
  } ) => {
    const page = await getPage(browser, 'Alice', Map.url("empty"));
    if (isMobile(page)) {
      await Menu.openMenu(page);
    }
    await oidcMatrixUserLogin(page);
    await ChatUtils.openChat(page);
    await ChatUtils.openCreateRoomDialog(page);
    const privateChatRoom = `Encrypted_${ChatUtils.getRandomName()}`;
    await page.getByTestId("createRoomName").fill(privateChatRoom);
    await page.getByTestId("createRoomVisibility").selectOption("private");
    await page.getByText('Activate end to end encryption').click();
    await page.getByTestId("createRoomEncryption").check();
    await page.getByTestId("createRoomButton").click();
    await ChatUtils.initEndToEndEncryption(privateChatRoom, page, page.context());
    const otherPage = await getPage(browser, 'Bob', Map.url("empty"));
    if (isMobile(otherPage)) {
      await Menu.openMenu(otherPage);
    }
    await oidcMatrixUserLogin(otherPage);
    await ChatUtils.openChat(otherPage);
    await otherPage.getByTestId('chatBackward').click();
    await otherPage.getByText(privateChatRoom).click();
    await otherPage.getByTestId("VerifyWithAnotherDeviceButton").click();

    await page.getByTestId("VerifyTheSessionButton").click();

    await page.getByTestId("matchButton").click();

    await otherPage.getByTestId("mismatchButton").click();

    await expect(page.getByTestId("errorEmojiLabel")).toBeAttached();

    await otherPage.close();
    await otherPage.context().close();
    await page.close();
    await page.context().close();
  });
});
