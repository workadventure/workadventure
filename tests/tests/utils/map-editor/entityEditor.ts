import * as path from "path";
import { expect, Page } from "@playwright/test";

class EntityEditor {
  async selectEntity(page: Page, nb: number, search?: string) {
    if (search != undefined) {
      await page.getByPlaceholder("Search").click();
      await page.getByPlaceholder("Search").fill(search);
    }

    // Wait for the entity to be displayed
    await expect(page.getByTestId("entity-item").nth(nb)).toHaveCount(1, { timeout: 30000 });
    // Click on the entity to select it
    await page.getByTestId("entity-item").nth(nb).click();

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
    await this.wait2Frames(page);
    await page.mouse.move(x, y);
    await page.mouse.move(x, y);
    await page.mouse.down({ button: "left" });
    await page.mouse.up({ button: "left" });
    await this.wait2Frames(page);
  }

  async moveAndRightClick(page: Page, x: number, y: number) {
    await this.wait2Frames(page);
    await page.mouse.move(x, y);
    await page.mouse.move(x, y);
    await page.mouse.down({ button: "right" });
    await page.mouse.up({ button: "right" });
    await this.wait2Frames(page);
  }

  async clearEntitySelection(page: Page) {
    await page.getByTestId("clearEntitySelection").click();
    await expect(page.getByTestId("clearEntitySelection")).toHaveCount(0);
    await this.wait2Frames(page);
  }

  async addProperty(page: Page, property: string) {
    await page.getByTestId(property).click();
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
    await expect(page.getByTestId('megaphone-switch')).toBeVisible();
    await page.getByTestId('megaphone-switch').click();
    await page.locator(".map-editor .sidebar input#searchable").setChecked(value);
  }

  async uploadTestAsset(page: Page) {
    await page
      .getByTestId("uploadCustomAsset")
      .setInputFiles(path.join(__dirname, `../../assets/${this.getTestAssetFile()}`));
    await page.getByTestId("floatingObject").check();
    await this.applyEntityModifications(page);
  }

  async uploadTestAssetWithOddSize(page: Page) {
    await page
      .getByTestId("uploadCustomAsset")
      .setInputFiles(path.join(__dirname, `../../assets/${this.getTestAssetFileWithOddSize()}`));
    await page.getByTestId("floatingObject").check();
    await this.applyEntityModifications(page);
  }

  async openEditEntityForm(page: Page) {
    await page.getByTestId("editEntity").click();
  }

  async applyEntityModifications(page: Page) {
    await page.getByTestId("applyEntityModifications").click();
    if(await page.getByTestId('entityImageLoader').isVisible({timeout: 2000})){
      // Check loader end
      await expect(page.getByTestId('entityImageLoader')).toHaveCount(0, { timeout: 30000 });
    }
    // Verify that there is no error message
    await expect(page.getByTestId("entityImageError")).toHaveCount(0);
    // Verify that the image uploaded is displayed in the list
    if(await page.getByTestId('clearCurrentSelection').isVisible()){
      // Back to the main list
      await page.getByTestId('clearCurrentSelection').click();
    }
  }

  async removeEntity(page: Page) {
    await page.getByTestId("removeEntity").click();
  }

  async setOpenLinkProperty(page: Page, link: string) {
    await page.locator(".map-editor .sidebar .properties-container input#tabLink").fill(link);
  }

  async setOpenPdfProperty(page: Page) {
    const fileChooserPromise = page.waitForEvent("filechooser");
    await page.locator(".map-editor .sidebar .properties-container span#chooseUpload").click();
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles(path.join(__dirname, `../../assets/ipsum-lorem.pdf`));
  }

  getTestAssetFile(){
    return `${this.getTestAssetName()}.png`;
  }

  getTestAssetFileWithOddSize(){
    return `${this.getTestAssetName()}OddSize.png`;
  }

  getTestAssetName() {
    return "testAsset";
  }

  private async wait2Frames(page: Page) {
    await page.evaluate(async () => {
      await window.e2eHooks.waitForNextFrame();
      await window.e2eHooks.waitForNextFrame();
    });
  }
}

export default new EntityEditor();
