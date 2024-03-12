import { Locator, Page } from "@playwright/test";

class AreaEditor {
  async selectMegaphoneItemInCMR(page: Page) {
    await page.locator('li:has-text("Megaphone")').click();
  }
  async drawArea(page: Page, topLeft: { x: number; y: number }, bottomRight: { x: number; y: number }) {
    await page.mouse.move(topLeft.x, topLeft.y);
    await page.mouse.down();
    await page.mouse.move(bottomRight.x, bottomRight.y);
    await page.mouse.up();
  }

  async addProperty(page: Page, property: string) {
    await page.locator(".map-editor .sidebar .properties-buttons .add-property-button", { hasText: property }).click();
  }

  async setSpeakerMegaphoneProperty(page: Page, name: string) {
    await page.getByPlaceholder("MySpeakerZone").click();
    await page.getByPlaceholder("MySpeakerZone").fill(name);
    await page.getByPlaceholder("MySpeakerZone").press("Enter");
  }

  async setListenerZoneProperty(page: Page, name: string) {
    await page
      .locator(".map-editor .sidebar .properties-container select#speakerZoneSelector")
      .selectOption({ label: name });
  }

  async setAreaName(page: Page, name: string) {
    await page.getByPlaceholder("MyArea").click();
    await page.getByPlaceholder("MyArea").fill(name);
    await page.getByPlaceholder("MyArea").press("Enter");
  }

  async setAreaDescription(page: Page, Description: string) {
    await page.getByText("+ Add description field").click();
    await page.getByPlaceholder("My area is a...").click();
    await page.getByPlaceholder("My area is a...").fill(Description);
    await page.getByPlaceholder("My area is a...").press("Enter");
  }

  async setAreaSearcheable(page: Page, value: boolean) {
    await page.locator(".map-editor .sidebar input#searchable").setChecked(value);
  }

  async setExitProperty(page: Page, mapName: string, startAreaName: string) {
    await page
      .locator(".map-editor .sidebar .properties-container select#exitMapSelector")
      .selectOption({ label: mapName });
    await page
      .locator(".map-editor .sidebar .properties-container select#startAreaNameSelector")
      .selectOption({ label: startAreaName });
  }

  async setAreaRightProperty(page: Page, writeRights: string[], readRights: string[]) {
    await page.getByTestId("addRights").click();
    const writeRightsInput = await page.getByTestId("writeTags");
    for (const writeRight of writeRights) {
      await this.fullFillAreaRight(writeRightsInput, writeRight);
    }
    const readRightsInput = await page.getByTestId("readTags");
    for (const readRight of readRights) {
      await this.fullFillAreaRight(readRightsInput, readRight);
    }
  }

  private async fullFillAreaRight(locator: Locator, right: string) {
    await locator.click();
    await locator.fill(right);
    await locator.press("Enter");
  }
}

export default new AreaEditor();
