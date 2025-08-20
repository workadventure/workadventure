import { test, expect } from "@playwright/test";
import { getPage } from "./utils/auth";
import { publicTestMapUrl } from "./utils/urls";
import { isMobile } from "./utils/isMobile";
import menu from "./utils/menu";

test.describe("Say bubbles", () => {
    test.beforeEach(
        "Ignore tests on mobilechromium because map editor not available for mobile devices",
        ({ page }) => {
            //Map Editor not available on mobile
            if (isMobile(page)) {
                //eslint-disable-next-line playwright/no-skipped-test
                test.skip();
                return;
            }
        }
    );

    test("should display a speech bubble and be received by other users", async ({ browser }) => {
        // Create two browser contexts for Alice and Bob
        const alicePage = await getPage(browser, 'Alice',
            publicTestMapUrl("tests/E2E/empty.json", "say_bubbles")
        );
        const bobPage = await getPage(browser, 'Bob',
            publicTestMapUrl("tests/E2E/empty.json", "say_bubbles")
        );

        // Wait for both users to be connected
        await alicePage.waitForTimeout(2000);
        await bobPage.waitForTimeout(2000);

        // Alice sends a message
        await alicePage.keyboard.press("Enter");
        await alicePage.keyboard.type("Hello Bob, this is a test message!");
        await alicePage.keyboard.press("Enter");

        // Wait for the speech bubble to appear for both users
        const aliceSpeechBubble = await alicePage.waitForSelector(".say-bubble", { timeout: 5000 });
        const bobSpeechBubble = await bobPage.waitForSelector(".say-bubble", { timeout: 5000 });

        // Verify the speech bubble is visible and contains the correct text for both users
        await expect(aliceSpeechBubble).toBeVisible();
        await expect(aliceSpeechBubble).toHaveText("Hello Bob, this is a test message!");

        await expect(bobSpeechBubble).toBeVisible();
        await expect(bobSpeechBubble).toHaveText("Hello Bob, this is a test message!");

        // Close both pages
        await alicePage.close();
        await bobPage.close();
    });

    test("should display a thinking bubble and be received by other users", async ({ browser }) => {
        // Create two browser contexts for Alice and Bob
        const alicePage = await getPage(browser, 'Alice',
            publicTestMapUrl("tests/E2E/empty.json", "say_bubbles")
        );
        const bobPage = await getPage(browser, 'Bob',
            publicTestMapUrl("tests/E2E/empty.json", "say_bubbles")
        );

        // Wait for both users to be connected
        await alicePage.waitForTimeout(2000);
        await bobPage.waitForTimeout(2000);

        // Alice sends a thinking message
        await alicePage.keyboard.down("Control");
        await alicePage.keyboard.press("Enter");
        await alicePage.keyboard.up("Control");
        await alicePage.keyboard.type("This is a thinking message for Bob!");
        await alicePage.keyboard.press("Enter");

        // Wait for the thinking bubble to appear for both users
        const aliceThinkingBubble = await alicePage.waitForSelector(".thinking-cloud", { timeout: 5000 });
        const bobThinkingBubble = await bobPage.waitForSelector(".thinking-cloud", { timeout: 5000 });

        // Verify the thinking bubble is visible and contains the correct text for both users
        await expect(aliceThinkingBubble).toBeVisible();
        await expect(aliceThinkingBubble).toHaveText("This is a thinking message for Bob!");

        await expect(bobThinkingBubble).toBeVisible();
        await expect(bobThinkingBubble).toHaveText("This is a thinking message for Bob!");

        // Close both pages
        await alicePage.close();
        await bobPage.close();
    });

    test("should display a Say and Think bubble via action menu", async ({ browser }) => {
        // Create two browser contexts for Alice and Bob
        const alicePage = await getPage(browser, 'Alice',
            publicTestMapUrl("tests/E2E/empty.json", "say_bubbles")
        );

        // Wait for both users to be connected
        await alicePage.waitForTimeout(2000);

        // Click on the emoji button to open the action menu
        await menu.openEmoji(alicePage);
        // Open say popup
        await menu.clickOnSayBubble(alicePage);
        // Close the Say popup
        await menu.closeSayPopup(alicePage);
        // Open think popup
        await menu.clickOnThinkBubble(alicePage);
    });
});
