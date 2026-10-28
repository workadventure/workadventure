import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";
import { resetWamMaps } from "../utils/map-editor/uploader";
import Map from "../utils/map";
import { oidcMatrixUserLogin } from "../utils/oidc";
import { getPage } from "../utils/auth";
import { isMobileViewport } from "../utils/isMobile";
import ChatUtils from "./chatUtils";

test.setTimeout(120000);

async function openRoomWithAMessage(page: Page, message: string) {
    await oidcMatrixUserLogin(page);
    await ChatUtils.openChat(page);
    await ChatUtils.openCreateRoomDialog(page);
    const roomName = ChatUtils.getRandomName();
    await page.getByTestId("createRoomName").fill(roomName);
    await page.getByPlaceholder("Users").click();
    await page.getByPlaceholder("Users").press("Enter");
    await page.getByTestId("createRoomButton").click();
    await page.getByText(roomName).click();
    await page.getByTestId("messageInput").fill(message);
    await page.getByTestId("sendMessageButton").click();
    await expect(page.getByText(message)).toBeVisible();
}

test.describe("Matrix chat message actions @oidc @matrix @nowebkit", () => {
    test.beforeEach(async ({ request, browserName }) => {
        test.skip(browserName === "webkit", "WebKit has issues with camera/microphone");
        await resetWamMaps(request);
        await ChatUtils.resetMatrixDatabase();
    });

    test.afterAll("reset matrix database", async () => {
        await ChatUtils.resetMatrixDatabase();
    });

    test("The options of a message show up and work from the keyboard", async ({ browser, viewport }) => {
        test.skip(isMobileViewport(viewport), "Keyboard navigation is a desktop concern");
        await using page = await getPage(browser, "Alice", Map.url("empty"));
        await openRoomWithAMessage(page, "Keyboard message");

        const options = page.locator(".options").last();
        // Hidden until hovered or focused.
        await page.mouse.move(0, 0);
        await expect(options).toHaveCSS("opacity", "0");

        // The timeline comes before the input: walk back from the input into the last message's buttons.
        await page.getByTestId("messageInput").focus();
        const reply = options.getByTestId("replyToMessageButton");
        await expect(async () => {
            await page.keyboard.press("Shift+Tab");
            await expect(reply).toBeFocused({ timeout: 200 });
        }).toPass({ timeout: 15000 });
        await expect(options).toHaveCSS("opacity", "1");
        await expect(reply).toHaveAttribute("aria-label", "Reply");
        await expect(options.getByTestId("openEmojiPickerButton")).toHaveAttribute("aria-label", "React");
        await expect(options.getByTestId("editMessageButton")).toHaveAttribute("aria-label", "Edit");
        await expect(options.getByTestId("removeMessageButton")).toHaveAttribute("aria-label", "Delete");

        await page.keyboard.press("Enter");
        await expect(page.getByText("Reply to")).toBeVisible();
    });

    test("A long press opens the actions of a message in a sheet", async ({ browser, browserName }) => {
        // The finger is simulated with Chrome DevTools touch events: real touch input, with the click a
        // phone sends on release. Firefox and WebKit have no equivalent in Playwright.
        test.skip(browserName !== "chromium", "Touch input is simulated through the Chrome DevTools Protocol");
        await using page = await getPage(browser, "Alice", Map.url("empty"), {
            contextOptions: { viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true },
        });
        await openRoomWithAMessage(page, "Long press message");

        const bubble = page.locator(".message").filter({ hasText: "Long press message" }).last();
        const { x, y } = await bubble.evaluate((element) => {
            const rect = element.getBoundingClientRect();
            return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
        });
        const cdp = await page.context().newCDPSession(page);
        const longPress = async () => {
            await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x, y }] });
            // Holding the finger still is the gesture itself (the threshold is 500 ms).
            // eslint-disable-next-line playwright/no-wait-for-timeout
            await page.waitForTimeout(800);
            await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
        };

        const sheet = page.getByTestId("messageActionSheet");
        await longPress();
        await expect(sheet).toBeVisible();
        await expect(sheet.getByTestId("messageActionReply")).toBeVisible();
        // The release lands where the finger was, on the sheet: it must not trigger the action under it.
        // Nothing to wait on for something that must not happen: give the click time to arrive.
        // eslint-disable-next-line playwright/no-wait-for-timeout
        await page.waitForTimeout(500);
        await expect(sheet).toBeVisible();
        await expect(page.getByTestId("cancelMessageEditionButton")).toBeHidden();

        // A tap outside closes it.
        await page.touchscreen.tap(195, 120);
        await expect(sheet).toBeHidden();

        // Escape closes it too.
        await longPress();
        await expect(sheet).toBeVisible();
        await page.keyboard.press("Escape");
        await expect(sheet).toBeHidden();
    });
});
