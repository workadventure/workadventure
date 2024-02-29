import { Page } from "@playwright/test";

class Exploration {
    async openSreachMode(page: Page) {
        await page.locator('.map-editor .sidebar .properties-buttons .add-property-button', {hasText: 'Search mode'}).click();
    }
}
export default new Exploration();
