import * as path from "path";
import { expect, Page } from "@playwright/test";

class EntityEditor {
  async selectEntity(page: Page, nb: number, search?: string, expectedFilename?: string) {
    if (search != undefined) {
      await page.getByPlaceholder("Search").click();
      await page.getByPlaceholder("Search").fill(search);
    }
    await expect(page.getByTestId("entityImageLoader")).toHaveCount(0);
    await expect(page.getByTestId("entityImageError")).toHaveCount(0);
    await expect(page.getByTestId("entity-item").nth(nb)).toHaveCount(1);
    if (expectedFilename) {
      const responseOnTestAssetClicked = page.waitForResponse((response) => response.url().includes(expectedFilename));
      await page.getByTestId("entity-item").nth(nb).click();
      await responseOnTestAssetClicked;
    } else {
      await page.getByTestId("entity-item").nth(nb).click();
    }
    // That's bad, but we need to wait a bit for the canvas to put the object.
    // eslint-disable-next-line playwright/no-wait-for-timeout
    await page.waitForTimeout(1000);
  }

  async searchEntity(page: Page, search: string) {
    await page.getByPlaceholder("Search").click();
    await page.getByPlaceholder("Search").fill(search);
    return page.getByTestId("entity-item").nth(0);
  }

  async moveAndClick(page: Page, x: number, y: number) {
    await page.evaluate(async () => {
      await window.e2eHooks.waitForNextFrame();
      await window.e2eHooks.waitForNextFrame();
    });
    await page.mouse.move(x, y);
    await page.mouse.move(x, y);
    await page.mouse.down({ button: "left" });
    await page.mouse.up({ button: "left" });
    await page.evaluate(async () => {
      await window.e2eHooks.waitForNextFrame();
      await window.e2eHooks.waitForNextFrame();
    });
  }

  async clearEntitySelection(page: Page) {
    await page.getByTestId("clearEntitySelection").click();
    await expect(page.getByTestId("clearEntitySelection")).toHaveCount(0);
    // That's bad, but we need to wait a bit for the canvas to put the object.
    // eslint-disable-next-line playwright/no-wait-for-timeout
    await page.waitForTimeout(2000);
  }

  async addProperty(page: Page, property: string) {
    await page.locator(".map-editor .sidebar .properties-buttons .add-property-button", { hasText: property }).click();
  }

  async setEntityName(page: Page, name: string) {
    await page.getByPlaceholder("MyObject").click();
    await page.getByPlaceholder("MyObject").fill(name);
    await page.getByPlaceholder("MyObject").press("Enter");
  }

  async setEntityDescription(page: Page, Description: string) {
    await page.getByText("+ Add description field").click();
    await page.getByPlaceholder("My object is a...").click();
    await page.getByPlaceholder("My object is a...").fill(Description);
    await page.getByPlaceholder("My object is a...").press("Enter");
  }

  async setEntitySearcheable(page: Page, value: boolean) {
    await page.locator(".map-editor .sidebar input#searchable").setChecked(value);
  }

  async uploadTestAsset(page: Page) {
    await page
      .getByTestId("uploadCustomAsset")
      .setInputFiles(path.join(__dirname, `../../assets/${this.getTestAssetName()}`));
    await page.getByTestId("floatingObject").check();
    await this.applyEntityModifications(page);
  }

  async openEditEntityForm(page: Page) {
    await page.getByTestId("editEntity").click();
  }

  async applyEntityModifications(page: Page) {
    await page.getByTestId("applyEntityModifications").click();
  }

  async removeEntity(page: Page) {
    await page.getByTestId("removeEntity").click();
  }

  getTestAssetName() {
    return "testAsset.png";
  }
}

export default new EntityEditor();
