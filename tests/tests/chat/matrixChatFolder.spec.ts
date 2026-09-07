import { expect, test } from "@playwright/test";
import { resetWamMaps } from "../utils/map-editor/uploader";
import Map from "../utils/map";
import { oidcMatrixUserLogin } from "../utils/oidc";
import { getPage } from "../utils/auth";
import ChatUtils from "./chatUtils";

test.setTimeout(120000);

test.describe("Matrix chat folders @oidc @matrix @nowebkit", () => {
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

    test("Create a public folder", async ({ browser }) => {
        await using page = await getPage(browser, "Alice", Map.url("empty"));
        await oidcMatrixUserLogin(page);
        await ChatUtils.openChat(page);
        await ChatUtils.openCreateFolderDialog(page);
        const publicFolder = ChatUtils.getRandomName();
        await page.getByTestId("createFolderName").fill(publicFolder);
        // await page.getByTestId("createFolderVisibility").selectOption("public");
        await page.getByPlaceholder("Users").click();
        await page.getByPlaceholder("Users").press("Enter");
        await page.getByTestId("createFolderButton").click();
        await page.getByTestId("roomAccordeon").click();
        await expect(page.getByText(publicFolder)).toBeAttached();
    });

    test("Create a private folder", async ({ browser }) => {
        await using page = await getPage(browser, "Alice", Map.url("empty"));
        await oidcMatrixUserLogin(page);
        await ChatUtils.openChat(page);
        await ChatUtils.openCreateFolderDialog(page);
        const privateFolder = ChatUtils.getRandomName();
        await page.getByTestId("createFolderName").fill(privateFolder);
        // await page.getByTestId("createFolderVisibility").selectOption("private");
        await page.getByPlaceholder("Users").click();
        await page.getByPlaceholder("Users").press("Enter");
        await page.getByTestId("createFolderButton").click();
        await page.getByTestId("roomAccordeon").click();
        await expect(page.getByText(privateFolder)).toBeAttached();
    });

    test("Create a nested folder", async ({ browser }) => {
        await using page = await getPage(browser, "Alice", Map.url("empty"));
        await oidcMatrixUserLogin(page);
        await ChatUtils.openChat(page);

        await ChatUtils.openCreateFolderDialog(page);
        const privateFolder1 = ChatUtils.getRandomName();
        await page.getByTestId("createFolderName").fill(privateFolder1);
        // await page.getByTestId("createFolderVisibility").selectOption("private");
        await page.getByPlaceholder("Users").click();
        await page.getByPlaceholder("Users").press("Enter");
        await page.getByTestId("createFolderButton").click();
        await page.getByTestId("roomAccordeon").click();
        await expect(page.getByText(privateFolder1)).toBeAttached();

        const privateFolder2 = ChatUtils.getRandomName();
        //eslint-disable-next-line playwright/no-wait-for-timeout
        await page.waitForTimeout(1000);
        await ChatUtils.openCreateFolderDialog(page, privateFolder1);
        await page.getByTestId("createFolderName").fill(privateFolder2);
        // await page.getByTestId("createFolderVisibility").selectOption("private");
        await page.getByTestId("createFolderButton").click();

        await expect(page.getByText(privateFolder2)).toBeHidden({
            timeout: 60000,
        });
        await page.getByText(privateFolder1).click();
        await expect(page.getByText(privateFolder2)).toBeVisible();
    });

    test("Create a room in a folder", async ({ browser }) => {
        await using page = await getPage(browser, "Alice", Map.url("empty"));
        await oidcMatrixUserLogin(page);
        await ChatUtils.openChat(page);

        await ChatUtils.openCreateFolderDialog(page);
        const privateFolder1 = ChatUtils.getRandomName();
        await page.getByTestId("createFolderName").fill(privateFolder1);
        // await page.getByTestId("createFolderVisibility").selectOption("private");
        await page.getByPlaceholder("Users").click();
        await page.getByPlaceholder("Users").press("Enter");
        await page.getByTestId("createFolderButton").click();
        await page.getByTestId("roomAccordeon").click();
        await expect(page.getByText(privateFolder1)).toBeAttached();

        const room = ChatUtils.getRandomName();
        await ChatUtils.openCreateRoomDialog(page, privateFolder1);
        await page.getByTestId("createRoomName").fill(room);
        // await page.getByTestId("createRoomVisibility").selectOption("public");
        await page.getByTestId("createRoomButton").click();
        //eslint-disable-next-line playwright/no-wait-for-timeout
        await page.waitForTimeout(1000);
        await page.getByText(privateFolder1).click();
        await expect(page.getByText(room)).toBeAttached();
    });

    test("Create a restricted room", async ({ browser }) => {
        await using page = await getPage(browser, "Alice", Map.url("empty"));
        await oidcMatrixUserLogin(page);
        await ChatUtils.openChat(page);

        await ChatUtils.openCreateFolderDialog(page);
        const privateFolder1 = ChatUtils.getRandomName();
        await page.getByTestId("createFolderName").fill(privateFolder1);
        // await page.getByTestId("createFolderVisibility").selectOption("private");
        await page.getByPlaceholder("Users").click();
        await page.getByPlaceholder("Users").press("Enter");
        await page.getByTestId("createFolderButton").click();
        await page.getByTestId("roomAccordeon").click();
        await expect(page.getByText(privateFolder1)).toBeAttached();
        const room = ChatUtils.getRandomName();
        await ChatUtils.openCreateRoomDialog(page, privateFolder1);
        await page.getByTestId("createRoomName").fill(room);
        // await page.getByTestId("createRoomVisibility").selectOption("restricted");
        await page.getByTestId("createRoomButton").click();
        await page.getByTestId(`toggleFolder${privateFolder1}`).click();

        await expect(page.getByText(room)).toBeAttached();
    });
});
