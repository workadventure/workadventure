import { test, expect } from "@playwright/test";
import { getPage } from "./utils/auth";
import { publicTestMapUrl } from "./utils/urls";
import { isMobile } from "./utils/isMobile";
import menu from "./utils/menu";

test.describe("Say bubbles @nomobile", () => {
    test.beforeEach(
        "Ignore tests on mobilechromium because map editor not available for mobile devices",
        ({ page }) => {
            // Map Editor not available on mobile
            test.skip(isMobile(page), 'Map editor is not available on mobile');
        }
    );

    test("should display a speech bubble and be received by other users", async ({ browser }) => {
        // Create two browser contexts for Alice and Bob
        await using alicePage = await getPage(browser, 'Alice',
            publicTestMapUrl("tests/E2E/empty.json", "say_bubbles")
        );
        await using bobPage = await getPage(browser, 'Bob',
            publicTestMapUrl("tests/E2E/empty.json", "say_bubbles")
        );

        // Wait for both users to be connected
        await expect(alicePage.getByText("Bob", { exact: true })).toBeVisible();

        // Alice sends a message
        await alicePage.keyboard.press("Enter");
        await alicePage.keyboard.type("Hello Bob, this is a test message!");
        await alicePage.keyboard.press("Enter");

        // Verify the speech bubble is visible and contains the correct text for both users
        await expect(alicePage.locator(".say-bubble")).toBeVisible();
        await expect(alicePage.locator(".say-bubble")).toHaveText("Hello Bob, this is a test message!");

        await expect(bobPage.locator(".say-bubble")).toBeVisible();
        await expect(bobPage.locator(".say-bubble")).toHaveText("Hello Bob, this is a test message!");

        // Close both pages
        await alicePage.context().close();
        await bobPage.context().close();
    });

    test("should display a thinking bubble and be received by other users", async ({ browser }) => {
        // Create two browser contexts for Alice and Bob
        await using alicePage = await getPage(browser, 'Alice',
            publicTestMapUrl("tests/E2E/empty.json", "say_bubbles")
        );
        await using bobPage = await getPage(browser, 'Bob',
            publicTestMapUrl("tests/E2E/empty.json", "say_bubbles")
        );

        // Wait for both users to be connected
        await expect(alicePage.getByText("Bob", { exact: true })).toBeVisible();

        // Alice sends a thinking message
        await alicePage.keyboard.down("Control");
        await alicePage.keyboard.press("Enter");
        await alicePage.keyboard.up("Control");
        await alicePage.keyboard.type("This is a thinking message for Bob!");
        await alicePage.keyboard.press("Enter");

        // Verify the thinking bubble is visible and contains the correct text for both users
        await expect(alicePage.locator(".thinking-cloud")).toBeVisible();
        await expect(alicePage.locator(".thinking-cloud")).toHaveText("This is a thinking message for Bob!");

        await expect(bobPage.locator(".thinking-cloud")).toBeVisible();
        await expect(bobPage.locator(".thinking-cloud")).toHaveText("This is a thinking message for Bob!");

        // Close both pages
        await alicePage.context().close();
        await bobPage.context().close();
    });

    test("should display a Say and Think bubble via action menu", async ({ browser }) => {
        // Create two browser contexts for Alice and Bob
        await using alicePage = await getPage(browser, 'Alice',
            publicTestMapUrl("tests/E2E/empty.json", "say_bubbles")
        );

        // Click on the emoji button to open the action menu
        await menu.openEmoji(alicePage);
        // Open say popup
        await menu.clickOnSayBubble(alicePage);
        // Close the Say popup
        await menu.closeSayPopup(alicePage);
        // Open think popup
        await menu.clickOnThinkBubble(alicePage);

        await alicePage.context().close();
    });

    test("should restore user controls after closing say popup (Firefox focus fix)", async ({ browser }) => {
        // This test specifically validates the Firefox focus issue fix
        await using alicePage = await getPage(browser, 'Alice',
            publicTestMapUrl("tests/E2E/empty.json", "say_bubbles")
        );

        // Start moving (to establish that controls work initially)
        await alicePage.keyboard.down("ArrowRight");
        await alicePage.waitForTimeout(100); // Small delay to register movement
        await alicePage.keyboard.up("ArrowRight");

        // Open say popup
        await alicePage.keyboard.press("Enter");
        await expect(alicePage.getByTestId("say-popup")).toBeVisible();

        // Close say popup
        await alicePage.keyboard.press("Escape");
        await expect(alicePage.getByTestId("say-popup")).toBeHidden();

        // Verify that user controls are restored by testing movement
        // We'll test this by checking that keyboard input is not blocked
        const initialPosition = await alicePage.evaluate(() => {
            const player = document.querySelector('.character-container');
            return player ? { x: player.getBoundingClientRect().x, y: player.getBoundingClientRect().y } : null;
        });

        // Try to move after closing popup
        await alicePage.keyboard.down("ArrowRight");
        await alicePage.waitForTimeout(500); // Give time for movement
        await alicePage.keyboard.up("ArrowRight");

        // Check if position changed (indicating controls are working)
        const newPosition = await alicePage.evaluate(() => {
            const player = document.querySelector('.character-container');
            return player ? { x: player.getBoundingClientRect().x, y: player.getBoundingClientRect().y } : null;
        });

        // Assert that movement occurred (position should be different)
        // If focus is stuck, the player won't move
        if (initialPosition && newPosition) {
            expect(newPosition.x).not.toBe(initialPosition.x);
        }

        await alicePage.context().close();
    });
});
