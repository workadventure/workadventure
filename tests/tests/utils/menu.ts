import {expect, Page} from "@playwright/test";
import {expectInViewport} from "./viewport";

export async function openChat(page: Page) {
    await page.click('button.chat-btn');
    await expectInViewport("#chatWindow", page);
    await expect(page.locator('button.chat-btn')).toHaveClass(/border-top-light/);
}
