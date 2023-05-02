import {expect, Page} from "@playwright/test";
import {expectInViewport} from "./viewport";

class Menu {
    async openChat(page: Page) {
        await page.click('button.chat-btn');
        await expectInViewport('#chatWindow', page);
        await expect(page.locator('button.chat-btn')).toHaveClass(/border-top-light/);
        await expect(page.locator('#chatWindow')).toHaveClass(/show/);
    }

    async openMapEditor(page: Page) {
        await page.getByRole('button', {name: 'toggle-map-editor'}).click();
        await expect(await page.getByRole('button', {name: 'toggle-map-editor'}).first()).toHaveClass(/border-top-light/);
    }

    async isThereMegaphoneButton(page: Page) {
        await expect(await page.locator('.bottom-action-bar .bottom-action-button #megaphone')).toBeDefined();
    }

    async isNotThereMegaphoneButton(page: Page) {
        await page.locator('.bottom-action-bar .bottom-action-button #megaphone').highlight();
        await expect(await page.locator('.bottom-action-bar .bottom-action-button #megaphone')).toBeHidden();
    }
}

export default new Menu();
