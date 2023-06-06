import {expect, test} from '@playwright/test';
import Menu from "./utils/menu";
import {login} from "./utils/roles";
import MapEditor from "./utils/mapeditor";
import Megaphone from "./utils/map-editor/megaphone";
import AreaEditor from "./utils/map-editor/areaEditor";
import Map from "./utils/map";
import ConfigureMyRoom from "./utils/map-editor/configureMyRoom";

const protocol = process.env.MAP_STORAGE_PROTOCOL ?? 'http';
const mapUrl = `${protocol}://play.workadventure.localhost/~/maps/areas.wam`;

test.setTimeout(240_000); // Fix Webkit that can take more than 60s
test.describe('Map editor', () => {
  test('Successfully set the megaphone feature', async ({ page, browser }) => {
    await page.goto(mapUrl);
    await page.evaluate(() => localStorage.setItem('debug', '*'));
    await login(page, "test", 3);
    await Map.walkTo(page, 'ArrowLeft', 1_500);

    // Second browser
    const newBrowser = await browser.browserType().launch();
    const page2 = await newBrowser.newPage();
    await page2.goto(mapUrl);
    await page2.evaluate(() => localStorage.setItem('debug', '*'));
    await login(page2, "test2", 5);

    await Menu.openMapEditor(page);
    await MapEditor.openConfigureMyRoom(page);
    await ConfigureMyRoom.selectMegaphoneItemInCMR(page);

    // Enabling megaphone and settings default value
    await Megaphone.toggleMegaphone(page);
    await Megaphone.isMegaphoneEnabled(page);

    // Testing if no input is set, megaphone should not be usable but WA should not crash
    await Megaphone.megaphoneInputNameSpace(page, '');
    await Megaphone.megaphoneSave(page);
    await Megaphone.isNotCorrectlySaved(page);

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
    await page.goto(mapUrl);
    await page.evaluate(() => localStorage.setItem('debug', '*'));
    await login(page, "test", 3);
    await Map.walkTo(page, 'ArrowLeft', 1_500);

    // Second browser
    const newBrowser = await browser.browserType().launch();
    const page2 = await newBrowser.newPage();
    await page2.goto(mapUrl);
    await page2.evaluate(() => localStorage.setItem('debug', '*'));
    await login(page2, "test2", 5);

    await Menu.toggleMegaphoneButton(page);

    await expect(await page.locator('.cameras-container .other-cameras .jitsi-video')).toBeVisible();
    await expect(await page2.locator('.cameras-container .other-cameras .jitsi-video')).toBeVisible();

    await Menu.toggleMegaphoneButton(page);
  });

  test('Successfully set areas in the map editor', async ({ page, browser }) => {
    await page.goto(mapUrl);
    await page.evaluate(() => localStorage.setItem('debug', '*'));
    await login(page, "test", 3);

    await Menu.openMapEditor(page);
    await MapEditor.openAreaEditor(page);
    await AreaEditor.drawArea(page, {x: 150, y: 300}, {x: 300, y: 600});
    await AreaEditor.addProperty(page, 'SpeakerZone for megaphone');
    await AreaEditor.setSpeakerMegaphoneProperty(page);
    await AreaEditor.drawArea(page, {x: 350, y: 300}, {x: 500, y: 600});
    await AreaEditor.addProperty(page, 'ListenerZone for megaphone');
    await AreaEditor.setListenerZoneProperty(page);
    await Menu.closeMapEditor(page);
    await Map.walkToPosition(page, 400, 450);


    // Second browser
    const newBrowser = await browser.browserType().launch();
    const page2 = await newBrowser.newPage();
    await page2.goto(mapUrl);
    await page2.evaluate(() => localStorage.setItem('debug', '*'));
    await login(page2, "test2", 5);
    await Map.walkToPosition(page2, 200, 450);

    await expect(await page2.locator('.cameras-container .other-cameras .jitsi-video')).toBeVisible();
    await expect(await page.locator('.cameras-container .other-cameras .jitsi-video')).toBeVisible();
  });
});
