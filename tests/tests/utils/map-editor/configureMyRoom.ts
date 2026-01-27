import type { Page } from "@playwright/test";

class ConfigureMyRoom {
    async selectMegaphoneItemInCMR(page: Page) {
        await page.locator('li:has-text("Megaphone")').click();
    }

    async selectRecordingItemInCMR(page: Page) {
        await page.locator('li:has-text("Recording")').click();
    }
}

export default new ConfigureMyRoom();
