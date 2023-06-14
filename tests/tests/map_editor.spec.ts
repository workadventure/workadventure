import {expect, test, webkit} from '@playwright/test';
import Menu from "./utils/menu";
import {login} from "./utils/roles";
import MapEditor from "./utils/mapeditor";
import Megaphone from "./utils/map-editor/megaphone";
import AreaEditor from "./utils/map-editor/areaEditor";
import Map from "./utils/map";
import ConfigureMyRoom from "./utils/map-editor/configureMyRoom";
import {resetWamMaps} from "./utils/map-editor/uploader";


const protocol = process.env.MAP_STORAGE_PROTOCOL ?? 'http';
const mapUrl = `${protocol}://play.workadventure.localhost/~/maps/empty.wam`;

test.setTimeout(240_000); // Fix Webkit that can take more than 60s
test.use({
  baseURL: (process.env.MAP_STORAGE_PROTOCOL ?? "http") + "://john.doe:password@" + (process.env.MAP_STORAGE_ENDPOINT ?? 'map-storage.workadventure.localhost'),
})
test.describe('Map editor', () => {
  test('Successfully set the megaphone feature', async ({ page, browser, request }) => {
    await resetWamMaps(request);
    await page.goto(mapUrl);
    //await page.evaluate(() => localStorage.setItem('debug', '*'));
    await login(page, "test", 3);
    await Map.walkToPosition(page, 5*32, 5*32);

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

    await Megaphone.megaphoneInputNameSpace(page, `${browser.browserType().name()}MySpace`);
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
    await Menu.closeMapEditor(page);

    // Play a sound using the megaphone
    if(browser.browserType() === webkit) {
      await page2.close();
      //eslint-disable-next-line playwright/no-skipped-test
      test.skip();
      return;
    }

    await Menu.toggleMegaphoneButton(page);

    // chack if the menu container is opened
    await expect(await page.locator('.menu-container')).toBeVisible({timeout: 5_000});
    // click on the megaphone button to start streaming session
    await page.locator('.menu-container #start_megaphone').click({timeout: 5_000});

    await expect(await page2.locator('.cameras-container .other-cameras .jitsi-video')).toBeVisible({timeout: 5_000});

    await Menu.toggleMegaphoneButton(page);

    await page2.close();


    // TODO IN THE FUTURE (PlayWright doesn't support it) : Add test if sound is correctly played
  });

  test('Successfully set areas in the map editor', async ({ page, browser, request }) => {
    if(browser.browserType() === webkit) {
      //eslint-disable-next-line playwright/no-skipped-test
      test.skip();
      return;
    }

    await resetWamMaps(request);

    await page.goto(mapUrl);
    //await page.evaluate(() => { localStorage.setItem('debug', '*'); });
    //await page.reload();
    await login(page, "test", 3);

    await Menu.openMapEditor(page);
    await MapEditor.openAreaEditor(page);
    await AreaEditor.drawArea(page, {x: 1*32*1.5, y: 5}, {x: 9*32*1.5, y: 4*32*1.5});
    await AreaEditor.addProperty(page, 'SpeakerZone for megaphone');
    await AreaEditor.setSpeakerMegaphoneProperty(page, `${browser.browserType().name()}SpeakerZone`);
    await AreaEditor.drawArea(page, {x: 1*32*1.5, y: 6*32*1.5}, {x: 9*32*1.5, y: 9*32*1.5});
    await AreaEditor.addProperty(page, 'ListenerZone for megaphone');
    await AreaEditor.setListenerZoneProperty(page, `${browser.browserType().name()}SpeakerZone`);
    await Menu.closeMapEditor(page);
    await Map.walkToPosition(page, 4*32, 2*32);
    await expect(await page.locator('.cameras-container .other-cameras .jitsi-video')).toBeVisible({timeout: 20_000});


    // Second browser
    const newBrowser = await browser.browserType().launch();
    const page2 = await newBrowser.newPage();
    await page2.goto(mapUrl);
    //await page2.evaluate(() => { localStorage.setItem('debug', '*'); });
    //await page2.reload();
    await login(page2, "test2", 5);
    await Map.walkToPosition(page2, 4*32, 7*32);

    await expect(await page2.locator('.cameras-container .other-cameras .jitsi-video')).toBeVisible({timeout: 20_000});
  });
});
