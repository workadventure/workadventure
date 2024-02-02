import {expect, Page} from "@playwright/test";

class Megaphone {
    async toggleMegaphone(page: Page) {
        await page.locator('.map-editor .configure-my-room input[type="checkbox"]').check();
    }

    async isMegaphoneEnabled(page: Page) {
        await page.locator('.map-editor .configure-my-room input[type="checkbox"]').isChecked();
    }

    async megaphoneInputNameSpace(page: Page, name = 'MySpace') {
        await page.getByPlaceholder('MySpace').focus();
        await page.getByPlaceholder('MySpace').click();
        if(name === ''){
            const count = (await page.getByPlaceholder('MySpace').inputValue()).length;
            for(let i = 0; i < count; i++) {
                await page.getByPlaceholder('MySpace').press("Backspace");
            }
        } else {
            await page.getByPlaceholder('MySpace').fill(name);
        }
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
        await expect(await page.locator('.map-editor .configure-my-room .content button:disabled')).toContainText('Megaphone settings saved');
    }

    async isNotCorrectlySaved(page: Page) {
        await expect(await page.locator('.map-editor .configure-my-room .content button:disabled')).toContainText('Error while saving megaphone settings');
    }
}

export default new Megaphone();