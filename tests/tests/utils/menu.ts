import {expect, Page} from "@playwright/test";
import {expectInViewport} from "./viewport";

export async function openChat(page: Page) {
    await page.click('button.chat-btn');
    await expectInViewport('#chatWindow', page);
    await expect(page.locator('button.chat-btn')).toHaveClass(/border-top-light/);
    await expect(page.locator('#chatWindow')).toHaveClass(/show/);
}

export async function openMapEditor(page: Page) {
    await page.getByRole('button', { name: 'toggle-map-editor' }).click();
    await expect(await page.getByRole('button', {name: 'toggle-map-editor'}).first()).toHaveClass(/border-top-light/);
}
