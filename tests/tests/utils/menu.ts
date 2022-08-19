import {expect, Page} from "@playwright/test";
import {inViewport} from "./viewport";

export async function openChat(page: Page) {
    await page.click('button.chat-btn');
    await expect(await inViewport("#chatWindow", page)).toBeTruthy();
    await expect(page.locator('button.chat-btn')).toHaveClass(/border-top-light/);
}
