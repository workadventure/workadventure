import { Page } from "@playwright/test";
import { expectInViewport } from "./viewport";

class MapEditor {
  async openConfigureMyRoom(page: Page) {
    await page.locator("section.side-bar-container .side-bar .tool-button button#WAMSettingsEditor").click();
    await expectInViewport(".configure-my-room", page);
  }

  async openAreaEditor(page: Page) {
    await page.locator("section.side-bar-container .side-bar .tool-button button#AreaEditor").first().click();
  }

  async openEntityEditor(page: Page) {
    await page.locator("section.side-bar-container .side-bar .tool-button button#EntityEditor").first().click({force: true});
    // note: set click force to true because sometimes a property tooltip is overlapping the button
  }

  async openExploration(page: Page) {
    await page.locator('section.side-bar-container .side-bar .tool-button button#ExploreTheRoom').first().click();
    await page.locator('section.side-bar-container .side-bar .tool-button button#ExploreTheRoom').first().click();
  }

  async openTrashEditor(page: Page) {
    await page.locator("section.side-bar-container .side-bar .tool-button button#TrashEditor").first().click();
  }
}

export default new MapEditor();
