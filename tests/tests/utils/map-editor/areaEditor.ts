import {Page} from "@playwright/test";

class AreaEditor {
    async selectMegaphoneItemInCMR(page: Page) {
        await page.locator('li:has-text("Megaphone")').click();
    }
    async drawArea(page: Page, topLeft: {x: number, y: number}, bottomRight: {x: number, y: number}) {
        await page.mouse.move(topLeft.x, topLeft.y);
        await page.mouse.down();
        await page.mouse.move(bottomRight.x, bottomRight.y);
        await page.mouse.up();
    }

    async addProperty(page: Page, property: string) {
        await page.locator('.map-editor .sidebar .properties-buttons .add-property-button', {hasText: property}).click();
    }

    async setSpeakerMegaphoneProperty(page: Page, name = "MySpeakerZone") {
        await page.getByPlaceholder('MySpeakerZone').click();
        await page.getByPlaceholder('MySpeakerZone').fill(name);
        await page.getByPlaceholder('MySpeakerZone').press('Enter');
    }

    async setListenerZoneProperty(page: Page, name = "MySpeakerZone"){
        await page.locator('.map-editor .sidebar .properties-container select#speakerZoneSelector').selectOption({label: name});
    }
}

export default new AreaEditor();