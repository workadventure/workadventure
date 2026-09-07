import { expect, test } from "@playwright/test";
import { resetWamMaps } from "../utils/map-editor/uploader";
import Map from "../utils/map";
import { oidcMatrixUserLogin } from "../utils/oidc";
import { getPage } from "../utils/auth";
import Menu from "../utils/menu";
import ChatUtils from "./chatUtils";

test.setTimeout(120000);

test.describe("Matrix chat session verification @oidc @matrix @nowebkit", () => {
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

    test("Verify a session with emoji", async ({ browser }) => {
        await using page = await getPage(browser, "Alice", Map.url("empty"));
        await Menu.openMenuIfMobile(page);
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

        await Map.teleportToPosition(page, 0, 0);

        await using otherPage = await getPage(browser, "Bob", Map.url("empty"));
        await Menu.openMenuIfMobile(otherPage);
        await oidcMatrixUserLogin(otherPage);
        await ChatUtils.openChat(otherPage);
        await otherPage.getByText(privateChatRoom).click();
        await otherPage.getByTestId("VerifyWithAnotherDeviceButton").click();

        await page.getByTestId("VerifyTheSessionButton").click();

        await page.getByTestId("matchButton").click();

        await otherPage.getByTestId("matchButton").click();

        await expect(page.getByTestId("understoodButton")).toBeAttached();

        await expect(otherPage.getByTestId("understoodButton")).toBeAttached();
    });

    test("Verify a session with emoji , one device click on mismatch button", async ({ browser }) => {
        await using page = await getPage(browser, "Alice", Map.url("empty"));
        await Menu.openMenuIfMobile(page);
        await oidcMatrixUserLogin(page);
        await ChatUtils.openChat(page);
        await ChatUtils.openCreateRoomDialog(page);
        const privateChatRoom = `Encrypted_${ChatUtils.getRandomName()}`;
        await page.getByTestId("createRoomName").fill(privateChatRoom);
        await page.getByPlaceholder("Users").click();
        await page.getByPlaceholder("Users").press("Enter");

        await page.getByText("Activate end to end encryption").click();
        await page.getByTestId("createRoomEncryption").check();
        await page.getByTestId("createRoomButton").click();
        await ChatUtils.initEndToEndEncryption(privateChatRoom, page, page.context());

        await Map.teleportToPosition(page, 0, 0);

        await using otherPage = await getPage(browser, "Bob", Map.url("empty"));
        await Menu.openMenuIfMobile(otherPage);
        await oidcMatrixUserLogin(otherPage);
        await ChatUtils.openChat(otherPage);
        await otherPage.getByText(privateChatRoom).click();
        await otherPage.getByTestId("VerifyWithAnotherDeviceButton").click();

        await page.getByTestId("VerifyTheSessionButton").click();

        await page.getByTestId("matchButton").click();

        await otherPage.getByTestId("mismatchButton").click();

        await expect(page.getByTestId("errorEmojiLabel")).toBeAttached();
    });
});
