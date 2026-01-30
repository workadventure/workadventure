import { expect, test } from "@playwright/test";
import Map from "../utils/map";
import { publicTestMapUrl } from "../utils/urls";
import { getPage } from "../utils/auth";
import { isMobile } from "../utils/isMobile";

test.describe("Chat IME (Japanese) @nomobile @nowebkit", () => {
    test.beforeEach("Ignore on mobile and webkit", ({ browserName, page }) => {
        test.skip(browserName === "webkit" || isMobile(page), "WebKit has camera issues; mobile has different chat UX");
    });

    /**
     * E2E scenario (Japanese IME): Enter during composition must not send;
     * Enter after composition sends. Example: むずかしい (composing) → Enter to confirm → 難しい (converted).
     * Proximity chat only: open chat, no Matrix, no zone creation.
     */
    test("Enter during IME composition does not send, Enter after composition sends (むずかしい → 難しい) @chat @nofirefox", async ({
        browser,
    }) => {
        const mapUrl = publicTestMapUrl("tests/E2E/empty.json", "chat_ime");

        await using page = await getPage(browser, "Alice", mapUrl);
        await Map.teleportToPosition(page, 160, 160);

        await using page2 = await getPage(browser, "Bob", mapUrl);
        await Map.teleportToPosition(page2, 160, 160);

        await expect(page.locator("#cameras-container").getByText("You")).toBeVisible({ timeout: 30_000 });
        await expect(page.locator("#cameras-container").getByText("Bob")).toBeVisible({ timeout: 30_000 });

        await page.getByTestId("chat-btn").click();
        const messageInput = page.getByTestId("messageInput");
        await messageInput.click();

        // During composition: user has typed むずかしい (pre-conversion).
        const duringComposition = "むずかしい";
        const afterComposition = "難しい";
        await messageInput.fill(duringComposition);

        // Simulate IME: compositionstart then Enter with isComposing true (confirm conversion).
        // Our fix must not send; input must still contain the composing text.
        await messageInput.evaluate((el) => {
            el.dispatchEvent(new CompositionEvent("compositionstart", { bubbles: true }));
            el.dispatchEvent(
                new KeyboardEvent("keydown", {
                    key: "Enter",
                    keyCode: 13,
                    isComposing: true,
                    bubbles: true,
                }),
            );
        });

        await expect(messageInput).toContainText(duringComposition);

        // End composition with converted text 難しい; simulate IME applying the conversion.
        await messageInput.evaluate((el, converted: string) => {
            el.dispatchEvent(new CompositionEvent("compositionend", { bubbles: true, data: converted }));
            el.textContent = converted;
            el.dispatchEvent(new Event("input", { bubbles: true }));
        }, afterComposition);

        // Allow compositionend setTimeout(0) to run so next Enter is not treated as composing.
        // eslint-disable-next-line playwright/no-wait-for-timeout
        await page.waitForTimeout(50);

        await messageInput.press("Enter");

        await expect(page2.locator("#message").getByText(afterComposition)).toBeVisible({ timeout: 20_000 });
    });
});
