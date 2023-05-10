import {expect, test} from '@playwright/test';
import Menu from "./utils/menu";
import {login} from "./utils/roles";
import MapEditor from "./utils/mapeditor";
import Megaphone from "./utils/map-editor/megaphone";
import Map from "./utils/map";
import ConfigureMyRoom from "./utils/map-editor/configureMyRoom";

test.describe('Map editor', () => {
  test('Successfully set the megaphone feature', async ({ page, browser }) => {
    await page.goto('http://play.workadventure.localhost/~/maps/areas.wam');
    await login(page, "test", 3);
    await Map.walkTo(page, 'ArrowLeft', 1_500);

    // Second browser
    const newBrowser = await browser.browserType().launch();
    const page2 = await newBrowser.newPage();
    await page2.goto('http://play.workadventure.localhost/~/maps/areas.wam');
    await login(page2, "test2", 5);

    await Menu.openMapEditor(page);
    await MapEditor.openConfigureMyRoom(page);
    await ConfigureMyRoom.selectMegaphoneItemInCMR(page);

    // Enabling megaphone and settings default value
    await Megaphone.toggleMegaphone(page);
    await Megaphone.isMegaphoneEnabled(page);
    await Megaphone.megaphoneInputNameSpace(page);
    await Megaphone.megaphoneSelectScope(page);
    await Megaphone.megaphoneAddNewRights(page, 'example');
    await Megaphone.megaphoneSave(page);
    await Megaphone.isCorrectlySaved(page);
    // Test if tags are working correctly, all current users doesn't have the tag "example" to use megaphone
    await Menu.isNotThereMegaphoneButton(page);
    await Menu.isNotThereMegaphoneButton(page2);
    // Remove rights
    await Megaphone.megaphoneRemoveRights(page, 'example');
    await Megaphone.megaphoneSave(page);
    await Megaphone.isCorrectlySaved(page);
    // Megaphone should be displayed and usable by all the current users
    await Menu.isThereMegaphoneButton(page);
    await Menu.isThereMegaphoneButton(page2);

    await page2.close();

    
    // TODO IN THE FUTURE (PlayWright doesn't support it) : Add test if sound is correctly played
  });

  test('Successfully use the megaphone', async ({ page, browser }) => {
    await page.goto('http://play.workadventure.localhost/~/maps/areas.wam');
    await login(page, "test", 3);
    await Map.walkTo(page, 'ArrowLeft', 1_500);

    // Second browser
    const newBrowser = await browser.browserType().launch();
    const page2 = await newBrowser.newPage();
    await page2.goto('http://play.workadventure.localhost/~/maps/areas.wam');
    await login(page2, "test2", 5);

    await Menu.toggleMegaphoneButton(page);

    expect(await page.locator('.cameras-container .other-cameras .jitsi-video')).toBeDefined();
    expect(await page2.locator('.cameras-container .other-cameras .jitsi-video')).toBeDefined();

    await Menu.toggleMegaphoneButton(page);
  });
});
