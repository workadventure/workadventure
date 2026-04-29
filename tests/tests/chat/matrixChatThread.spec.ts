import { expect, test, type Locator, type Page } from "@playwright/test";
import { resetWamMaps } from "../utils/map-editor/uploader";
import Map from "../utils/map";
import { oidcMatrixUserLogin } from "../utils/oidc";
import { getPage } from "../utils/auth";
import ChatUtils from "./chatUtils";

test.setTimeout(120000);

async function openFreshMatrixRoom(page: Page, roomName: string) {
    await ChatUtils.openChat(page);
    await ChatUtils.openCreateRoomDialog(page);
    await page.getByTestId("createRoomName").fill(roomName);
    await page.getByPlaceholder("Users").click();
    await page.getByPlaceholder("Users").press("Enter");
    await page.getByTestId("createRoomButton").click();
    await page.getByTestId(roomName).click({ timeout: 60_000 });
}

async function sendMessageToTimeline(timeline: Locator, message: string) {
    await timeline.getByTestId("messageInput").fill(message);
    await timeline.getByTestId("messageInput").press("Enter");
}

test.describe("Matrix chat threads @oidc @matrix @nowebkit", () => {
    test.beforeEach(async ({ request, browserName }) => {
        test.skip(browserName === "webkit", "WebKit has issues with camera/microphone");
        await resetWamMaps(request);
        await ChatUtils.resetMatrixDatabase();
    });

    test.afterAll(async () => {
        await ChatUtils.resetMatrixDatabase();
    });

    test("should open thread details in the side panel and keep the main room timeline visible", async ({
        browser,
    }) => {
        await using page = await getPage(browser, "Alice", Map.url("empty"));
        await oidcMatrixUserLogin(page);

        const roomName = ChatUtils.getRandomName();
        await openFreshMatrixRoom(page, roomName);

        await page.locator("#resize-bar").dblclick();
        await expect(page.getByTestId("threadPanelTitle")).toHaveText("All threads");
        await expect(page.getByTestId("threadPanelEmpty")).toBeVisible();

        const mainTimeline = page.getByTestId("roomTimeline");
        await sendMessageToTimeline(mainTimeline, "Root message");

        const rootTimelineItem = mainTimeline.locator("li[data-event-id]").last();
        await rootTimelineItem.hover();
        await rootTimelineItem.getByTestId("openThreadButton").click();

        const threadTimeline = page.getByTestId("threadPanelTimeline");
        await expect(threadTimeline).toBeVisible();
        await expect(mainTimeline.locator("li[data-event-id]")).toHaveCount(1);
        await expect(threadTimeline.locator("li[data-event-id]")).toHaveCount(1);

        await sendMessageToTimeline(threadTimeline, "Thread reply");
        await expect(threadTimeline.locator("li[data-event-id]")).toHaveCount(2);
        await expect(threadTimeline.locator("li[data-event-id]").nth(1)).toContainText("Thread reply");
        await expect(mainTimeline.locator("li[data-event-id]")).toHaveCount(1);
        await expect(mainTimeline.locator('[data-testid="threadSummary"]')).toContainText("1 reply");
        await expect(mainTimeline.locator('[data-testid="threadSummary"]')).toContainText("Thread reply");

        await sendMessageToTimeline(mainTimeline, "Second room message");
        await expect(mainTimeline.locator("li[data-event-id]")).toHaveCount(2);

        await page.getByTestId("threadPanelBack").click();
        await expect(page.getByTestId("threadPanelTitle")).toHaveText("All threads");
        await expect(page.getByTestId("threadPanelEmpty")).toHaveCount(0);
        await expect(page.getByTestId("threadPanelList").locator("button").first()).toContainText("Root message");
        await expect(page.getByTestId("threadPanelList").locator("button").first()).toContainText("1 reply");

        await page.getByTestId("threadPanelList").locator("button").first().click();
        await expect(page.getByTestId("threadPanelTimeline").locator("li[data-event-id]").nth(1)).toContainText(
            "Thread reply",
        );

        await page.close();
        await page.context().close();
    });
});
