import path from "path";
import type { Locator, Page} from "@playwright/test";
import {expect} from "@playwright/test";
import Menu from "../menu";

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
    let cameraTurnedOff = false;
    // If the area is towards the top of the screen, we turn off camera,
    if (bottomRight.y < 5 * 32 * 1.5 || topLeft.y < 5 * 32 * 1.5) {
      await Menu.turnOffCamera(page);
      cameraTurnedOff = true;
      await expect(page.getByText("You")).toBeHidden({
        timeout: 20_000,
      });
    }
    await page.mouse.move(topLeft.x, topLeft.y);
    await page.mouse.down();
    await page.mouse.move(bottomRight.x, bottomRight.y);
    await page.mouse.up();

    if (cameraTurnedOff) {
      await Menu.turnOnCamera(page);
    }
  }

  async addProperty(page: Page, property: string) {
    page.locator('.map-editor');
    page.locator('.map-editor .sidebar');
    page.locator('.map-editor .sidebar .item-picker-container');
    page.locator('select#speakerZoneSelector');
    await page.getByTestId(property).click();
  }

  async setPodiumNameProperty(page: Page, name: string , enableChat = false) {
    await page.getByPlaceholder("MainStage").click();
    await page.getByPlaceholder("MainStage").fill(name);
    await page.getByPlaceholder("MainStage").press("Enter");
    if(enableChat){
      await page.getByTestId("chatEnabled").click();
    }
  }

  async setMatchingPodiumZoneProperty(page: Page, name: string, enableChat = false) {
    await page
      .locator(
        ".map-editor .sidebar .properties-container select#speakerZoneSelector"
      )
      .selectOption({ label: name.toLowerCase() });
    if(enableChat){
      await page.getByTestId("chatEnabled").click();
    }
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
    const writeRightsInput = page.getByTestId("writeTags");
    for (const writeRight of writeRights) {
      await this.fullFillAreaRight(writeRightsInput, writeRight);
    }
    const readRightsInput = page.getByTestId("readTags");
    for (const readRight of readRights) {
      await this.fullFillAreaRight(readRightsInput, readRight);
    }
  }

  async setAreaLiveKitProperty(page: Page, startWithAudioMuted = false, startWithVideoMuted = false) {
    await page.getByTestId("livekitRoomProperty").click();
    if(!startWithAudioMuted && !startWithVideoMuted){
      return; 
    }

    await page.getByTestId("livekitRoomMoreOptionsButton").click();

    if(startWithVideoMuted){
      await page.getByTestId("startWithVideoMuted").check();
    }

    if(startWithAudioMuted){
      await page.getByTestId("startWithAudioMuted").check();
    }

    await page.getByTestId("livekitRoomConfigValidateButton").click(); //close the more options
  }

  async setOpenLinkProperty(page: Page, link: string, option = "Show immediately on enter") {
    await page.locator(".map-editor .sidebar .properties-container select#trigger").selectOption({ label: option });
    await page.locator(".map-editor .sidebar .properties-container input#tabLink").fill(link,{timeout : 20_000});
  }

  async setOpenFileProperty(page: Page, option = "Show immediately on enter") {
    await page.locator(".map-editor .sidebar .properties-container select#trigger").selectOption({ label: option });
    const fileChooserPromise = page.waitForEvent("filechooser");
    await page.locator(".map-editor .sidebar .properties-container span#chooseUpload").click();
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles(path.join(__dirname, `../../assets/lorem-ipsum.pdf`));
  }

  async deleteFile(page: Page) {
    await page.getByTestId("closeFileUpload").click();
  }

  async setMatrixChatRoomProperty(page: Page,shouldOpenAutomatically: boolean, roomName?: string){
    //TODO : find a better way to wait for the room to be created
    //eslint-disable-next-line playwright/no-wait-for-timeout
    await page.waitForTimeout(4000);
    await page.getByTestId("shouldOpenAutomaticallyCheckbox").click();

    if(roomName){
      await page.getByPlaceholder("My room").isEnabled({timeout : 20_000});
      await page.getByPlaceholder("My room").fill(roomName,{timeout : 20_000});
    }
    //TODO : find a better way to wait for the room to be created
    //eslint-disable-next-line playwright/no-wait-for-timeout
    await page.waitForTimeout(4000);
  }

  private async fullFillAreaRight(locator: Locator, right: string) {
    await locator.click();
    await locator.fill(right);
    await locator.press("Enter");
  }
}

export default new AreaEditor();
