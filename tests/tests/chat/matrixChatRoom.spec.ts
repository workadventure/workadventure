import { expect, test } from "@playwright/test";
import { resetWamMaps } from "../utils/map-editor/uploader";
import Map from "../utils/map";
import { oidcMatrixUserLogin } from "../utils/oidc";
import { getPage } from "../utils/auth";
import ChatUtils from "./chatUtils";

test.setTimeout(120000);

test.describe("Matrix chat rooms and messages @oidc @matrix @nowebkit", () => {
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

    test("Open matrix Chat", async ({ browser }) => {
        await using page = await getPage(browser, "Alice", Map.url("empty"));

        await oidcMatrixUserLogin(page);
        await ChatUtils.openChat(page);
        await expect(page.getByTestId("chat")).toBeAttached();
    });

    test("Create a public chat room", async ({ browser }) => {
        await using page = await getPage(browser, "Alice", Map.url("empty"));
        await oidcMatrixUserLogin(page);
        await ChatUtils.openChat(page);
        await ChatUtils.openCreateRoomDialog(page);
        const publicChatRoomName = ChatUtils.getRandomName();
        await page.getByTestId("createRoomName").fill(publicChatRoomName);
        await page.getByPlaceholder("Users").click();
        await page.getByPlaceholder("Users").press("Enter");
        await page.getByTestId("createRoomButton").click();
        await expect(page.getByText(publicChatRoomName)).toBeAttached();
    });

    test("Send messages in public chat room", async ({ browser }) => {
        await using page = await getPage(browser, "Alice", Map.url("empty"));
        await oidcMatrixUserLogin(page);
        await ChatUtils.openChat(page);
        await ChatUtils.openCreateRoomDialog(page);
        const publicChatRoomName = ChatUtils.getRandomName();
        await page.getByTestId("createRoomName").fill(publicChatRoomName);
        await page.getByPlaceholder("Users").click();
        await page.getByPlaceholder("Users").press("Enter");
        await page.getByTestId("createRoomButton").click();
        await page.getByText(publicChatRoomName).click();
        const chatMessageContent = "This is a test message";
        await page.getByTestId("messageInput").fill(chatMessageContent);
        await page.getByTestId("sendMessageButton").click();
        await expect(page.getByText(chatMessageContent)).toBeAttached();
    });

    test("Send application messages in public chat room", async ({ browser }) => {
        await using page = await getPage(browser, "Alice", Map.url("empty"));
        await oidcMatrixUserLogin(page);
        await ChatUtils.openChat(page);
        await ChatUtils.openCreateRoomDialog(page);
        const publicChatRoomName = ChatUtils.getRandomName();
        await page.getByTestId("createRoomName").fill(publicChatRoomName);
        await page.getByPlaceholder("Users").click();
        await page.getByPlaceholder("Users").press("Enter");
        await page.getByTestId("createRoomButton").click();
        await page.getByText(publicChatRoomName).click();
        const chatMessageContent = "This is a test message";
        await page.getByTestId("messageInput").click();
        await page.getByTestId("messageInput").fill(chatMessageContent);
        await page.getByTestId("sendMessageButton").click();
        await expect(page.getByText(chatMessageContent)).toBeAttached();
    });

    test("Send application messages and youtube link in public chat room", async ({ browser }) => {
        await using page = await getPage(browser, "Alice", Map.url("empty"));
        await oidcMatrixUserLogin(page);
        await ChatUtils.openChat(page);
        await ChatUtils.openCreateRoomDialog(page);
        const publicChatRoomName = ChatUtils.getRandomName();
        await page.getByTestId("createRoomName").fill(publicChatRoomName);
        await page.getByPlaceholder("Users").click();
        await page.getByPlaceholder("Users").press("Enter");
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
    });

    test("Send application messages and klaxoon link in public chat room", async ({ browser }) => {
        test.skip(
            process.env.IS_FORK === "true",
            "Skip Klaxoon test on forked PR because the secret env variable is not set",
        );

        await using page = await getPage(browser, "Alice", Map.url("empty"));
        await oidcMatrixUserLogin(page);
        await ChatUtils.openChat(page);
        await ChatUtils.openCreateRoomDialog(page);
        const publicChatRoomName = ChatUtils.getRandomName();
        await page.getByTestId("createRoomName").fill(publicChatRoomName);
        await page.getByPlaceholder("Users").click();
        await page.getByPlaceholder("Users").press("Enter");
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
        await (await popupPromise).close();

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
        await expect(page.getByRole("link", { name: "https://app.klaxoon.com/join/KXEWMSE3NF2M" })).toBeVisible();
        //await expect(page.getByText("https://app.klaxoon.com/join/KXEWMSE3NF2M?from=aG3stVtZnDmhrhqKc17to1OlfvyyEUeV")).toBeAttached();
        // check that the message is displayed
        await expect(page.getByText(chatMessageContent)).toBeAttached();
    });

    test("Reply to message", async ({ browser }) => {
        await using page = await getPage(browser, "Alice", Map.url("empty"));
        await oidcMatrixUserLogin(page);
        await ChatUtils.openChat(page);
        await ChatUtils.openCreateRoomDialog(page);
        const publicChatRoomName = ChatUtils.getRandomName();
        await page.getByTestId("createRoomName").fill(publicChatRoomName);
        await page.getByPlaceholder("Users").click();
        await page.getByPlaceholder("Users").press("Enter");
        await page.getByTestId("createRoomButton").click();
        await page.getByText(publicChatRoomName).click();
        const chatMessageContent = "This is a test message";
        await page.getByTestId("messageInput").fill(chatMessageContent);
        await page.getByTestId("sendMessageButton").click();
        await page.getByTestId("replyToMessageButton").click();
        await page.getByTestId("messageInput").fill("Sample response");
        await page.getByTestId("sendMessageButton").click();
        await expect(page.getByText(chatMessageContent)).toHaveCount(2);
    });

    test("React to message and remove reaction to message", async ({ browser }) => {
        await using page = await getPage(browser, "Alice", Map.url("empty"));
        await oidcMatrixUserLogin(page);
        await ChatUtils.openChat(page);
        await ChatUtils.openCreateRoomDialog(page);
        const publicChatRoomName = ChatUtils.getRandomName();
        await page.getByTestId("createRoomName").fill(publicChatRoomName);
        await page.getByPlaceholder("Users").click();
        await page.getByPlaceholder("Users").press("Enter");
        await page.getByTestId("createRoomButton").click();
        await page.getByText(publicChatRoomName).click();
        const chatMessageContent = "This is a test message";
        await page.getByTestId("messageInput").fill(chatMessageContent);
        await page.getByTestId("sendMessageButton").click();
        await page.getByTestId("openEmojiPickerButton").click();
        await page.getByRole("menu", { name: "Favorites" }).getByLabel("❤️, red heart, heart,").click();
        await expect(page.locator(".reactions-bar").getByText("❤️")).toBeVisible();
        await page.locator(".reactions-bar").getByText("❤️").click();
        await expect(page.locator(".reactions-bar").getByText("❤️")).toBeHidden();
    });

    test("Remove message", async ({ browser }) => {
        await using page = await getPage(browser, "Alice", Map.url("empty"));
        await oidcMatrixUserLogin(page);
        await ChatUtils.openChat(page);
        await ChatUtils.openCreateRoomDialog(page);
        const publicChatRoomName = ChatUtils.getRandomName();
        await page.getByTestId("createRoomName").fill(publicChatRoomName);
        await page.getByPlaceholder("Users").click();
        await page.getByPlaceholder("Users").press("Enter");
        await page.getByTestId("createRoomButton").click();
        await page.getByText(publicChatRoomName).click();
        const chatMessageContent = "This is a test message";
        await page.getByTestId("messageInput").fill(chatMessageContent);
        await page.getByTestId("sendMessageButton").click();
        await page.getByTestId("removeMessageButton").click();
        await expect(page.getByText(chatMessageContent)).not.toBeAttached();
    });

    test("Edit message", async ({ browser }) => {
        await using page = await getPage(browser, "Alice", Map.url("empty"));
        await oidcMatrixUserLogin(page);
        await ChatUtils.openChat(page);
        await ChatUtils.openCreateRoomDialog(page);
        const publicChatRoomName = ChatUtils.getRandomName();
        await page.getByTestId("createRoomName").fill(publicChatRoomName);
        await page.getByPlaceholder("Users").click();
        await page.getByPlaceholder("Users").press("Enter");
        await page.getByTestId("createRoomButton").click();
        await page.getByText(publicChatRoomName).click();
        const chatMessageContent = "This is a test message";
        const chatMessageEdited = "This is a test edited message";
        await page.getByTestId("messageInput").fill(chatMessageContent);
        await page.getByTestId("sendMessageButton").click();
        await page.getByTestId("editMessageButton").click();
        await page.getByTestId("editMessageInput").fill(chatMessageEdited);
        await page.getByTestId("saveMessageEditionButton").click();
        await expect(page.getByText(chatMessageEdited)).toBeAttached();
        await expect(page.getByText(chatMessageContent)).not.toBeAttached();
    });

    test("Cancel edit message", async ({ browser }) => {
        await using page = await getPage(browser, "Alice", Map.url("empty"));
        await oidcMatrixUserLogin(page);
        await ChatUtils.openChat(page);
        await ChatUtils.openCreateRoomDialog(page);
        const publicChatRoomName = ChatUtils.getRandomName();
        await page.getByTestId("createRoomName").fill(publicChatRoomName);
        await page.getByPlaceholder("Users").click();
        await page.getByPlaceholder("Users").press("Enter");
        await page.getByTestId("createRoomButton").click();
        await page.getByText(publicChatRoomName).click();
        const chatMessageContent = "This is a test message";
        const chatMessageEdited = "This is a test edited message";
        await page.getByTestId("messageInput").fill(chatMessageContent);
        await page.getByTestId("sendMessageButton").click();
        await page.getByTestId("editMessageButton").click();
        await page.getByTestId("editMessageInput").fill(chatMessageEdited);
        await page.getByTestId("cancelMessageEditionButton").click();
        await expect(page.getByText(chatMessageEdited)).not.toBeAttached();
        await expect(page.getByText(chatMessageContent)).toBeAttached();
    });
});
