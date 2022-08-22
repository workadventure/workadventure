import {expect, Page} from "@playwright/test";
import {expectInViewport} from "./viewport";

export async function openChat(page: Page) {
    try {
        // If chat is opened
        await expect(page.locator('#chatWindow')).toHaveClass(/show/, {timeout: 100});
    } catch {
        // If chat is not opened
        await page.click('button.chat-btn');
        await expectInViewport('#chatWindow', page);
        await expect(page.locator('button.chat-btn')).toHaveClass(/border-top-light/);
        await expect(page.locator('#chatWindow')).toHaveClass(/show/);
    }
}
