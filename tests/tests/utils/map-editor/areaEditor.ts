import {expect, Locator, Page} from "@playwright/test";

class AreaEditor {
  async selectMegaphoneItemInCMR(page: Page) {
    await page.locator('li:has-text("Megaphone")').click();
  }

  async drawArea(
    page: Page,
    topLeft: { x: number; y: number },
    bottomRight: { x: number; y: number }
  ) {
    await page.mouse.move(1, 1);
    // If the area is towards the top of the screen, we wait for the camera to be invisible
    if (bottomRight.y < 5 * 32 * 1.5 || topLeft.y < 5 * 32 * 1.5) {
      await expect(page.getByText("You")).toBeHidden({
        timeout: 20_000,
      });
    }
    await page.mouse.move(topLeft.x, topLeft.y);
    await page.mouse.down();
    await page.mouse.move(bottomRight.x, bottomRight.y);
    await page.mouse.up();
  }

  async addProperty(page: Page, property: string) {
    await page.locator('.map-editor');
        await page.locator('.map-editor .sidebar');
        await page.locator('.map-editor .sidebar .item-picker-container');
        await page.locator('select#speakerZoneSelector');
        await page.getByTestId(property).click();
  }

  async setSpeakerMegaphoneProperty(page: Page, name: string) {
    await page.getByPlaceholder("MySpeakerZone").click();
    await page.getByPlaceholder("MySpeakerZone").fill(name);
    await page.getByPlaceholder("MySpeakerZone").press("Enter");
  }

  async setListenerZoneProperty(page: Page, name: string) {
    await page
      .locator(
        ".map-editor .sidebar .properties-container select#speakerZoneSelector"
      )
      .selectOption({ label: name.toLowerCase() });
  }

  async setAreaName(page: Page, name: string) {
    await page.getByPlaceholder("MyArea").click();
    await page.getByPlaceholder("MyArea").fill(name);
    await page.getByPlaceholder("MyArea").press("Enter");
  }

  async setAreaDescription(page: Page, Description: string) {
    await page.getByText("Add description field").click();
    await page.getByPlaceholder("My area is a...").click();
    await page.getByPlaceholder("My area is a...").fill(Description);
    await page.getByPlaceholder("My area is a...").press("Enter");
  }

  async setAreaSearcheable(page: Page, value: boolean) {
    await page.locator('label').filter({ hasText: 'Searchable in the exploration' }).locator('div').click();

    /*    await page
      .locator(".map-editor .sidebar input#searchable")
      .setChecked(value);*/
  }

  async setExitProperty(page: Page, mapName: string, startAreaName: string) {
    await page
      .locator(
        ".map-editor .sidebar .properties-container select#exitMapSelector"
      )
      .selectOption({ label: mapName });
    await page
      .locator(
        ".map-editor .sidebar .properties-container select#startAreaNameSelector"
      )
      .selectOption({ label: startAreaName });
  }

  async setAreaRightProperty(
    page: Page,
    writeRights: string[],
    readRights: string[]
  ) {
    await page.getByTestId("restrictedRightsPropertyData").click();
    const writeRightsInput = await page.getByTestId("writeTags");
    for (const writeRight of writeRights) {
      await this.fullFillAreaRight(writeRightsInput, writeRight);
    }
    const readRightsInput = await page.getByTestId("readTags");
    for (const readRight of readRights) {
      await this.fullFillAreaRight(readRightsInput, readRight);
    }
  }

  async setOpenLinkProperty(page: Page, link: string, option = "Show immediately on enter") {
    await page.locator(".map-editor .sidebar .properties-container select#trigger").selectOption({ label: option });
    await page.locator(".map-editor .sidebar .properties-container input#tabLink").fill(link,{timeout : 20_000});
  }

  async setMatrixChatRoomProperty(page: Page,shouldOpenAutomatically: boolean, roomName?: string){
    //TODO : find a better way to wait for the room to be created
    await page.waitForTimeout(4000);
    await page.getByTestId("shouldOpenAutomaticallyCheckbox").click();

    if(roomName){
      await page.getByPlaceholder("My room").isEnabled({timeout : 20_000});
      await page.getByPlaceholder("My room").fill(roomName,{timeout : 20_000});
    }
        //TODO : find a better way to wait for the room to be created
    await page.waitForTimeout(4000);
  }

  private async fullFillAreaRight(locator: Locator, right: string) {
    await locator.click();
    await locator.fill(right);
    await locator.press("Enter");
  }
}

export default new AreaEditor();
