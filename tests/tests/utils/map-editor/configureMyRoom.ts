import {Page} from "@playwright/test";

class ConfigureMyRoom {
    async selectMegaphoneItemInCMR(page: Page) {
        await page.locator('li:has-text("Megaphone")').click();
    }
}

export default new ConfigureMyRoom();