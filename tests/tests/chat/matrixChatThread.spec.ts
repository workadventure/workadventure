import { expect, test, type Locator, type Page } from "@playwright/test";
import { resetWamMaps } from "../utils/map-editor/uploader";
import Map from "../utils/map";
import { oidcMatrixUserLogin } from "../utils/oidc";
import { getPage } from "../utils/auth";
import { isMobile } from "../utils/isMobile";
import ChatUtils from "./chatUtils";

test.setTimeout(120000);

async function openFreshMatrixRoom(page: Page, roomName: string) {
    await ChatUtils.openChat(page);
    await ChatUtils.openCreateRoomDialog(page);
    await page.getByTestId("createRoomName").fill(roomName);
    await page.getByPlaceholder("Users").click();
    await page.getByPlaceholder("Users").press("Enter");
    await page.getByTestId("createRoomButton").click();
    if (
        isMobile(page) &&
        (await page
            .getByTestId("roomTimeline")
            .isVisible({ timeout: 10_000 })
            .catch(() => false))
    ) {
        return;
    }

    await page.getByTestId(roomName).click({ timeout: 60_000 });
}

async function sendMessageToTimeline(timeline: Locator, message: string) {
    await timeline.getByTestId("messageInput").fill(message);
    await timeline.getByTestId("messageInput").press("Enter");
}

async function openRoomThreadsPanel(page: Page) {
    await page.getByTestId("toggleRoomSidePanelButton").click();
    await expect(page.getByTestId("roomSidePanelHome")).toBeVisible();
    await page.getByTestId("roomSidePanelHomeThreads").click();
}

async function closeRoomSidePanelOnMobile(page: Page) {
    if (!isMobile(page)) {
        return;
    }

    await page.getByTestId("closeRoomSidePanelButton").dispatchEvent("click");
    await expect(page.getByTestId("roomTimeline")).toBeVisible();
}

async function openSelectedThreadPanelOnMobile(page: Page) {
    if (!isMobile(page)) {
        return;
    }

    await page.getByTestId("toggleRoomSidePanelButton").click();
    await expect(page.getByTestId("threadPanelTimeline")).toBeVisible();
}

async function expectMainTimelinePlacementWhileThreadPanelOpen(page: Page, mainTimeline: Locator) {
    if (isMobile(page)) {
        await expect(mainTimeline).toBeHidden();
        return;
    }

    await expect(mainTimeline.locator("li[data-event-id]")).toHaveCount(1);
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
        await openRoomThreadsPanel(page);
        await expect(page.getByTestId("threadPanelTitle")).toHaveText("All threads");
        await expect(page.getByTestId("threadPanelEmpty")).toBeVisible();
        await closeRoomSidePanelOnMobile(page);

        const mainTimeline = page.getByTestId("roomTimeline");
        await sendMessageToTimeline(mainTimeline, "Root message");

        const rootTimelineItem = mainTimeline.locator("li[data-event-id]").last();
        await rootTimelineItem.hover();
        await rootTimelineItem.getByTestId("openThreadButton").click();

        const threadTimeline = page.getByTestId("threadPanelTimeline");
        await expect(threadTimeline).toBeVisible();
        await expectMainTimelinePlacementWhileThreadPanelOpen(page, mainTimeline);
        await expect(threadTimeline.locator("li[data-event-id]")).toHaveCount(1);

        await sendMessageToTimeline(threadTimeline, "Thread reply");
        await expect(threadTimeline.locator("li[data-event-id]")).toHaveCount(2);
        await expect(threadTimeline.locator("li[data-event-id]").nth(1)).toContainText("Thread reply");
        await closeRoomSidePanelOnMobile(page);
        await expect(mainTimeline.locator("li[data-event-id]")).toHaveCount(1);
        await expect(mainTimeline.locator('[data-testid="threadSummary"]')).toContainText("1 reply");
        await expect(mainTimeline.locator('[data-testid="threadSummary"]')).toContainText("Thread reply");

        await sendMessageToTimeline(mainTimeline, "Second room message");
        await expect(mainTimeline.locator("li[data-event-id]")).toHaveCount(2);

        await openSelectedThreadPanelOnMobile(page);
        await page.getByTestId("threadPanelBack").click();
        await expect(page.getByTestId("threadPanelTitle")).toHaveText("All threads");
        await expect(page.getByTestId("threadPanelEmpty")).toHaveCount(0);
        await expect(page.getByTestId("threadPanelList").locator("button").first()).toContainText("Root message");
        await expect(page.getByTestId("threadPanelList").locator("button").first()).toContainText("1 reply");

        await page.getByTestId("threadPanelList").locator("button").first().click();
        await expect(page.getByTestId("threadPanelTimeline").locator("li[data-event-id]").nth(1)).toContainText(
            "Thread reply",
        );
    });
});
