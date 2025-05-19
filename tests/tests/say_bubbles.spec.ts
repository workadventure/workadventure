import { test, expect } from "@playwright/test";
import { getPage } from "./utils/auth";
import { publicTestMapUrl } from "./utils/urls";

test.describe("Say bubbles", () => {
    // test.beforeEach(async ({ page }) => {

    // });

    test("should display a speech bubble when sending a message", async ({ browser }) => {

        const page = await getPage(browser, 'Alice',
            publicTestMapUrl("tests/E2E/empty.json", "say_bubbles")
        );
        // Open the say popup
        await page.keyboard.press("Enter");

        // Type a message
        await page.keyboard.type("Hello, this is a test message!");

        // Send the message
        await page.keyboard.press("Enter");

        // Wait for the speech bubble to appear
        const speechBubble = await page.waitForSelector(".say-bubble", { timeout: 5000 });

        // Verify the speech bubble is visible and contains the correct text
        expect(await speechBubble.isVisible()).toBeTruthy();
        expect(await speechBubble.textContent()).toBe("Hello, this is a test message!");

        await page.close();
    });

    test("should display a thinking bubble when sending a message with Ctrl", async ({ browser }) => {

        const page = await getPage(browser, 'Alice',
            publicTestMapUrl("tests/E2E/empty.json", "say_bubbles")
        );
        // Open the say popup
        await page.keyboard.press("Enter");

        // Type a message
        await page.keyboard.type("This is a thinking message!");

        // Send the message with Ctrl+Enter
        await page.keyboard.down("Control");
        await page.keyboard.press("Enter");
        await page.keyboard.up("Control");

        // Wait for the thinking bubble to appear
        const thinkingBubble = await page.waitForSelector(".thinking-cloud", { timeout: 5000 });

        // Verify the thinking bubble is visible and contains the correct text
        expect(await thinkingBubble.isVisible()).toBeTruthy();
        expect(await thinkingBubble.textContent()).toBe("This is a thinking message!");

        await page.close();
    });
});
