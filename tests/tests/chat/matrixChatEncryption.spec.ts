import { expect, test } from "@playwright/test";
import { resetWamMaps } from "../utils/map-editor/uploader";
import Map from "../utils/map";
import { oidcLogout, oidcMatrixUserLogin } from "../utils/oidc";
import { getPage } from "../utils/auth";
import { isMobile } from "../utils/isMobile";
import ChatUtils from "./chatUtils";

test.setTimeout(120000);

test.describe("Matrix chat encryption @oidc @matrix @nowebkit", () => {
    test.beforeEach(
        "Ignore tests on webkit because of issue with camera and microphone",

        async ({ request, browserName }) => {
            // WebKit has issue with camera
            test.skip(browserName === "webkit", "WebKit has issues with camera/microphone");
            await resetWamMaps(request);
            await ChatUtils.resetMatrixDatabase();
        },
    );

    test.afterAll("reset matrix database", async () => {
        await ChatUtils.resetMatrixDatabase();
    });

    // test("Create a private chat room", async ({ browser }) => {
    //   await using page = await getPage(browser, 'Alice', Map.url("empty"));
    //   await oidcMatrixUserLogin(page);
    //   await ChatUtils.openChat(page);
    //   await ChatUtils.openCreateRoomDialog(page);
    //   const privateChatRoom = ChatUtils.getRandomName();
    //   await page.getByTestId("createRoomName").fill(privateChatRoom);
    //   await page.getByTestId("createRoomVisibility").selectOption("private");
    //   await page.getByTestId("createRoomButton").click();
    //   await expect(page.getByText(privateChatRoom)).toBeAttached();
    //   await page.close();
    //   await page.close();
    // });

    // test("Create a private encrypted chat room (new user)", async ({
    //   browser }) => {
    //   await using page = await getPage(browser, 'Alice', Map.url("empty"));
    //   await oidcMatrixUserLogin(page);
    //   await ChatUtils.openChat(page);
    //   await ChatUtils.openCreateRoomDialog(page);
    //   const privateChatRoom = `Encrypted_${ChatUtils.getRandomName()}`;
    //   await page.getByTestId("createRoomName").fill(privateChatRoom);
    //   await page.getByTestId("createRoomVisibility").selectOption("private");
    //   await page.getByText('Activate end to end encryption').click();
    //   await page.getByTestId("createRoomEncryption").check();
    //   await page.getByTestId("createRoomButton").click();
    //   await ChatUtils.initEndToEndEncryption(privateChatRoom, page, page.context());
    //   await expect(page.getByText(privateChatRoom)).toBeAttached();
    //   await page.close();
    //   await page.close();
    // });

    // test("Send message in private chat room (new user)", async ({
    //   browser }) => {
    //   await using page = await getPage(browser, 'Alice', Map.url("empty"));
    //   await oidcMatrixUserLogin(page);
    //   await ChatUtils.openChat(page);
    //   await ChatUtils.openCreateRoomDialog(page);
    //   const privateChatRoom = `Encrypted_${ChatUtils.getRandomName()}`;
    //   await page.getByTestId("createRoomName").fill(privateChatRoom);
    //   await page.getByTestId("createRoomVisibility").selectOption("private");
    //   await page.getByText('Activate end to end encryption').click();
    //   await page.getByTestId("createRoomEncryption").check();
    //   await page.getByTestId("createRoomButton").click();
    //   await ChatUtils.initEndToEndEncryption(privateChatRoom, page, page.context());
    //   await page.getByText(privateChatRoom).click();
    //   const chatMessageContent = "This is a test message";
    //   await page.getByTestId("messageInput").fill(chatMessageContent);
    //   await page.getByTestId("sendMessageButton").click();
    //   await expect(page.getByText(chatMessageContent)).toBeAttached();
    //   await page.close();
    //   await page.close();
    // });

    test("Retrieve encrypted message", async ({ browser }) => {
        await using page = await getPage(browser, "Alice", Map.url("empty"));
        await oidcMatrixUserLogin(page);
        await ChatUtils.openChat(page);
        await ChatUtils.openCreateRoomDialog(page);
        const privateChatRoom = `Encrypted_${ChatUtils.getRandomName()}`;
        await page.getByTestId("createRoomName").fill(privateChatRoom);
        await page.getByPlaceholder("Users").click();
        await page.getByPlaceholder("Users").press("Enter");
        // await page.getByTestId("createRoomVisibility").selectOption("private");
        await page.getByText("Activate end to end encryption").click();
        await page.getByTestId("createRoomEncryption").check();
        await page.getByTestId("createRoomButton").click();
        await ChatUtils.initEndToEndEncryption(privateChatRoom, page, page.context());
        await page.getByText(privateChatRoom).click();
        const chatMessageContent = "This is a test message";
        await page.getByTestId("messageInput").fill(chatMessageContent);

        //We need to wait for the room key to be uploaded
        const roomKeyBackupPromise = page.waitForResponse(
            (response) => response.url().includes("keys?version") && response.status() === 200,
        );
        await page.getByTestId("sendMessageButton").click();
        await roomKeyBackupPromise;

        //We need to wait for anonym login to prevent issue with logout/login fast processing
        const anonymLoginPromise = page.waitForResponse(
            (response) => response.url().includes("anonymLogin") && response.status() === 200,
        );
        //eslint-disable-next-line playwright/no-conditional-in-test
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
    });

    test("Retrieve encrypted message after cancelling passphrase request", async ({ browser }) => {
        await using page = await getPage(browser, "Alice", Map.url("empty"));
        await oidcMatrixUserLogin(page);
        await ChatUtils.openChat(page);
        await ChatUtils.openCreateRoomDialog(page);
        const privateChatRoom = `Encrypted_${ChatUtils.getRandomName()}`;
        await page.getByTestId("createRoomName").fill(privateChatRoom);
        await page.getByPlaceholder("Users").click();
        await page.getByPlaceholder("Users").press("Enter");
        // await page.getByTestId("createRoomVisibility").selectOption("private");
        await page.getByText("Activate end to end encryption").click();
        await page.getByTestId("createRoomEncryption").check();
        await page.getByTestId("createRoomButton").click();
        await ChatUtils.initEndToEndEncryption(privateChatRoom, page, page.context());
        await page.getByText(privateChatRoom).click();
        const chatMessageContent = "This is a test message";
        await page.getByTestId("messageInput").fill(chatMessageContent);

        //We need to wait for the room key to be uploaded
        const roomKeyBackupPromise = page.waitForResponse(
            (response) => response.url().includes("keys?version") && response.status() === 200,
        );
        await page.getByTestId("sendMessageButton").click();
        await roomKeyBackupPromise;

        //We need to wait for anonym login to prevent issue with logout/login fast processing
        const anonymLoginPromise = page.waitForResponse(
            (response) => response.url().includes("anonymLogin") && response.status() === 200,
        );
        //eslint-disable-next-line playwright/no-conditional-in-test
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
    });

    test("Key creation should stop after the SSO process is canceled", async ({ browser }) => {
        await using page = await getPage(browser, "Alice", Map.url("empty"));
        await oidcMatrixUserLogin(page);
        await ChatUtils.openChat(page);
        await ChatUtils.openCreateRoomDialog(page);
        const privateChatRoom = `Encrypted_${ChatUtils.getRandomName()}`;
        await page.getByTestId("createRoomName").fill(privateChatRoom);
        await page.getByPlaceholder("Users").click();
        await page.getByPlaceholder("Users").press("Enter");
        // await page.getByTestId("createRoomVisibility").selectOption("private");
        await page.getByText("Activate end to end encryption").click();
        await page.getByTestId("createRoomEncryption").check();
        await page.getByTestId("createRoomButton").click();
        await page.getByText(privateChatRoom).click();
        await ChatUtils.cancelledContinueWithSSO(page, page.context());
        await page.getByTestId("chatBackward").click();

        await expect(page.getByText("Chat recovery key creation")).not.toBeAttached();
        await expect(page.getByText("Encryption not configured")).toBeAttached();
    });
});
