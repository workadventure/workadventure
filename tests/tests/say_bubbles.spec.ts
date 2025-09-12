import { test, expect } from "@playwright/test";
import { getPage } from "./utils/auth";
import { publicTestMapUrl } from "./utils/urls";
import { isMobile } from "./utils/isMobile";
import Map from "./utils/map";
import menu from "./utils/menu";

test.describe("Say bubbles @nomobile @nowebkit", () => {
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
        await expect(alicePage.getByText("Bob", { exact: true })).toBeVisible({ timeout: 20_000 });
        await Map.teleportToPosition(alicePage, 15*12, 15*12);
        
        // Alice sends a message
        await alicePage.keyboard.press("Enter");
        await alicePage.keyboard.type("Hello Bob, this is a test message!");
        await alicePage.keyboard.press("Enter");

        // Verify the speech bubble is visible and contains the correct text for both users
        await expect(alicePage.locator(".say-bubble")).toBeAttached();
        await expect(alicePage.locator(".say-bubble")).toHaveText("Hello Bob, this is a test message!");

        await expect(bobPage.locator(".say-bubble")).toBeAttached();
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
        //await Map.teleportToPosition(alicePage, 0, 0);
        await using bobPage = await getPage(browser, 'Bob',
            publicTestMapUrl("tests/E2E/empty.json", "say_bubbles")
        );

        // Wait for both users to be connected
        await expect(alicePage.getByText("Bob", { exact: true })).toBeVisible({timeout : 20_000});
        await Map.teleportToPosition(alicePage, 15*12, 15*12);

        // Alice sends a thinking message
        await alicePage.keyboard.down("Control");
        await alicePage.keyboard.press("Enter");
        await alicePage.keyboard.up("Control");
        await alicePage.keyboard.type("This is a thinking message for Bob!");
        await alicePage.keyboard.press("Enter");

        // Verify the thinking bubble is visible and contains the correct text for both users
        await expect(alicePage.locator(".thinking-cloud")).toBeAttached();
        await expect(alicePage.locator(".thinking-cloud")).toHaveText("This is a thinking message for Bob!");

        await expect(bobPage.locator(".thinking-cloud")).toBeAttached();
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
});
