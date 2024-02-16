import {expect, Page} from "@playwright/test";
import * as path from "path";

class EntityEditor {
  async selectEntity(page: Page, nb: number, search?: string) {
    if (search != undefined) {
      await page.getByPlaceholder("Search").click();
      await page.getByPlaceholder("Search").fill(search);
    }

    await page.getByTestId("entity-item").nth(nb).click();
  }

  async searchEntity(page: Page, search: string) {
    await page.getByPlaceholder("Search").click();
    await page.getByPlaceholder("Search").fill(search);

    return await page.getByTestId("entity-item").nth(0);
  }
    async moveAndClick(page: Page, x: number, y: number) {
        await page.mouse.move(x, y);
        await page.mouse.down();
        await page.mouse.up();
    }

  async quitEntitySelector(page: Page) {
    await page.getByTestId("mapEditor-close-button").click();

    await expect(page.getByTestId("mapEditor-close-button")).toHaveCount(0);
    // That's bad, but we need to wait a bit for the canvas to put the object.
    // eslint-disable-next-line playwright/no-wait-for-timeout
    await page.waitForTimeout(2000);
  }

    async addProperty(page: Page, property: string) {
        await page.locator('.map-editor .sidebar .properties-buttons .add-property-button', {hasText: property}).click();
    }

    async setEntityName(page: Page, name: string){
        await page.getByPlaceholder('MyObject').click();
        await page.getByPlaceholder('MyObject').fill(name);
        await page.getByPlaceholder('MyObject').press('Enter');
    }

    async setEntityDescription(page: Page, Description: string){
        await page.getByText('+ Add description field').click();
        await page.getByPlaceholder('My object is a...').click();
        await page.getByPlaceholder('My object is a...').fill(Description);
        await page.getByPlaceholder('My object is a...').press('Enter');
    }

    async setEntitySearcheable(page: Page, value: boolean){
        await page.locator('.map-editor .sidebar input#searchable').setChecked(value);
    }
}

export default new EntityEditor();
