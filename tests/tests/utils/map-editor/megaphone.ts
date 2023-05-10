import {expect, Page} from "@playwright/test";

class Megaphone {
    async toggleMegaphone(page: Page) {
        await page.locator('.map-editor .configure-my-room input[type="checkbox"]').check();
    }

    async isMegaphoneEnabled(page: Page) {
        await page.locator('.map-editor .configure-my-room input[type="checkbox"]').isChecked();
    }

    async megaphoneInputNameSpace(page: Page) {
        await page.getByPlaceholder('MySpace').click();
        await page.getByPlaceholder('MySpace').fill('Test');
    }

    async megaphoneSelectScope(page: Page) {
        await page.locator('.map-editor .configure-my-room select').first().selectOption('ROOM');
    }

    async megaphoneAddNewRights(page: Page, tag = 'test') {
        await page.locator(".map-editor .configure-my-room .content .input-tags .value-container input").fill(tag);
        await page.getByText(`Add new : ${tag.toLocaleUpperCase()}`).click();
    }

    async megaphoneRemoveRights(page: Page, tag = 'test') {
        await page.locator(".map-editor .configure-my-room .content .value-container .multi-item", {hasText: tag.toLocaleUpperCase()}).locator('.multi-item-clear').click();
    }

    async megaphoneSave(page: Page) {
        await page.getByRole('button', {name: 'Save'}).click();
    }

    async isCorrectlySaved(page: Page) {
        await expect(await page.locator('.map-editor .configure-my-room .content button:disabled')).toContainText('Successfully saved');
    }
}

export default new Megaphone();