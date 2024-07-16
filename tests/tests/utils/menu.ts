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
        await page.getByTestId('action-admin');
        await expect(page.locator('#action-admin')).toBeVisible();
        await page.click('#action-admin');

        await page.getByTestId('btn-admin');
        await expect(page.locator('#toggle-map-editor')).toBeVisible();
        await page.click('#toggle-map-editor');

        // Vérifiez que l'éditeur de carte est bien ouvert
        await expect(page.locator('.map-editor')).toBeVisible();
        // await page.getByRole('div', {name: 'toggle-map-editor'}).click();
    }

    async closeMenu(page: Page) {
        await page.locator('.menu-container').getByRole('button', { name: '×' }).click();
        await expect(await page.locator('#menuIcon')).not.toHaveClass(/border-top-light/);
    }

    async closeMapEditor(page: Page) {
        await page.getByRole('button', {name: 'close-window'}).click();
        await expect(await page.getByRole('button', {name: 'toggle-map-editor'}).first()).not.toHaveClass(/border-top-light/);
    }

    async toggleMegaphoneButton(page: Page) {
        await page.locator('.bottom-action-bar .bottom-action-button #megaphone').click({timeout: 5_000});
    }

    async isThereMegaphoneButton(page: Page) {
        await expect(await page.locator('.bottom-action-bar .bottom-action-button #megaphone')).toBeVisible({timeout: 30_000});
    }

    async isNotThereMegaphoneButton(page: Page) {
        await expect(await page.locator('.bottom-action-bar .bottom-action-button #megaphone')).toBeHidden({timeout: 30_000});
    }
}

export default new Menu();
