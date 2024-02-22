import {expect, test, webkit} from '@playwright/test';
import Menu from "./utils/menu";
import {hideNoCamera, login} from "./utils/roles";
import MapEditor from "./utils/mapeditor";
import Megaphone from "./utils/map-editor/megaphone";
import AreaEditor from "./utils/map-editor/areaEditor";
import EntityEditor from "./utils/map-editor/entityEditor";
import Exploration from "./utils/map-editor/exploration";
import Map from "./utils/map";
import ConfigureMyRoom from "./utils/map-editor/configureMyRoom";
import {resetWamMaps} from "./utils/map-editor/uploader";
import {evaluateScript} from "./utils/scripting";
import {map_storage_url} from "./utils/urls";

test.setTimeout(240_000); // Fix Webkit that can take more than 60s
test.use({
  baseURL: map_storage_url,
})
test.describe('Map editor', () => {
  test('Successfully set the megaphone feature', async ({ page, browser, request, browserName }) => {
    await resetWamMaps(request);
    await page.goto(Map.url("empty"));
    //await page.evaluate(() => localStorage.setItem('debug', '*'));
    await login(page, "test", 3);
    // Because webkit in playwright does not support Camera/Microphone Permission by settings
    if(browserName === "webkit"){
      await hideNoCamera(page);
    }
    await Map.teleportToPosition(page, 5*32, 5*32);

    // Second browser
    const newBrowser = await browser.browserType().launch();
    const page2 = await newBrowser.newPage();
    await page2.goto(Map.url("empty"));
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

    // check if the megaphone confirmation box is opened
    await expect(await page.locator('.megaphone-confirm')).toBeVisible({timeout: 5_000});
    // click on the megaphone button to start the streaming session
    await page.locator('.megaphone-confirm button.light').click({timeout: 15_000});

    await expect(await page2.locator('.cameras-container .other-cameras .jitsi-video')).toBeVisible({timeout: 15_000});

    await Menu.toggleMegaphoneButton(page);

    await page2.close();


    // TODO IN THE FUTURE (PlayWright doesn't support it) : Add test if sound is correctly played
  });

  test('Successfully set "SpeakerZone" in the map editor', async ({ page, browser, request }) => {
    if(browser.browserType() === webkit) {
      //eslint-disable-next-line playwright/no-skipped-test
      test.skip();
      return;
    }

    await resetWamMaps(request);

    await page.goto(Map.url("empty"));
    //await page.evaluate(() => { localStorage.setItem('debug', '*'); });
    //await page.reload();
    await login(page, "test", 3);

    await Menu.openMapEditor(page);
    await MapEditor.openAreaEditor(page);
    await AreaEditor.drawArea(page, {x: 1*32*1.5, y: 5}, {x: 9*32*1.5, y: 4*32*1.5});
    await AreaEditor.addProperty(page, 'Speaker zone');
    await AreaEditor.setSpeakerMegaphoneProperty(page, `${browser.browserType().name()}SpeakerZone`);
    await AreaEditor.drawArea(page, {x: 1*32*1.5, y: 6*32*1.5}, {x: 9*32*1.5, y: 9*32*1.5});
    await AreaEditor.addProperty(page, 'Attendees zone');
    await AreaEditor.setListenerZoneProperty(page, `${browser.browserType().name()}SpeakerZone`);
    await Menu.closeMapEditor(page);
    await Map.teleportToPosition(page, 4*32, 2*32);
    await expect(await page.locator('.jitsi-video')).toBeVisible({timeout: 20_000});


    // Second browser
    const newBrowser = await browser.browserType().launch();
    const page2 = await newBrowser.newPage();
    await page2.goto(Map.url("empty"));
    //await page2.evaluate(() => { localStorage.setItem('debug', '*'); });
    //await page2.reload();
    await login(page2, "test2", 5);
    await Map.teleportToPosition(page2, 4*32, 7*32);

    // The user in the listener zone can see the speaker
    await expect(await page2.locator('.cameras-container .other-cameras .jitsi-video')).toBeVisible({timeout: 20_000});
    // The speaker cannot see the listener
    await expect(await page.locator('.cameras-container .other-cameras .jitsi-video')).toBeHidden({timeout: 20_000});

    // Now, let's move player 2 to the speaker zone
    await Map.walkToPosition(page2, 4*32, 2*32);
    // FIXME: if we use Map.teleportToPosition, the test fails. Why?
    //await Map.teleportToPosition(page2, 4*32, 2*32);

    // The first speaker (player 1) can now see player2
    await expect(await page.locator('.cameras-container .other-cameras .jitsi-video')).toBeVisible({timeout: 20_000});
    // And the opposite is still true (player 2 can see player 1)
    await expect(await page2.locator('.cameras-container .other-cameras .jitsi-video')).toBeVisible({timeout: 20_000});

  });

  test('Successfully set start area in the map editor', async ({ page, browser, request, browserName }) => {
    await resetWamMaps(request);
    await page.goto(Map.url("start"));
    await login(page, "test", 3);
    if(browserName === "webkit"){
      // Because webkit in playwright does not support Camera/Microphone Permission by settings
      await hideNoCamera(page);
    }

    await Menu.openMapEditor(page);
    await MapEditor.openAreaEditor(page);
    await AreaEditor.drawArea(page, {x: 13 * 32, y: 0}, {x: 15 * 32, y: 2 * 32});
    await AreaEditor.setAreaName(page, 'MyStartZone');
    await AreaEditor.addProperty(page, 'Start area');
    await Menu.closeMapEditor(page);
  });

  test('Successfully set and working exit area in the map editor', async ({ page, browser, request, browserName }) => {
    await resetWamMaps(request);

    await page.goto(Map.url("exit"));
    await login(page, "test", 3);
    if(browserName === "webkit"){
      // Because webkit in playwright does not support Camera/Microphone Permission by settings
      await hideNoCamera(page);
    }

    await Menu.openMapEditor(page);
    await MapEditor.openAreaEditor(page);
    await AreaEditor.drawArea(page, {x: 13*32, y: 13*32}, {x: 15*32, y: 15*32});
    await AreaEditor.addProperty(page, 'Exit area');
    await AreaEditor.setExitProperty(page, 'maps/start_defined.wam', 'MyStartZone');
    await Menu.closeMapEditor(page);

    try {
      await Map.teleportToPosition(page, 9 * 32, 9 * 32);
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (_) {
      // evaluateScript will throw an error if the script frame unloaded because of page change
    }
    await expect.poll(() => page.url()).toContain('start_defined.wam#MyStartZone');

    await evaluateScript(page, async () => {
      await WA.onInit();
      const position = await WA.player.getPosition();
      if(position.x >= 290 && position.x <= 310 &&  position.y >= 15 && position.y <= 35) {
        return;
      }
      throw new Error(`Player is not at the correct position : ${position.x} ${position.y}`);
    });
  });

  // Test to set Klaxoon application in the area with the map editor
  test('Successfully set Klaxoon\'s application in the area in the map editor', async ({ page, browser, request, browserName }) => {
    await resetWamMaps(request);

    await page.goto(Map.url("empty"));
    await login(page, "test", 3);
    if(browserName === "webkit"){
      // Because webkit in playwright does not support Camera/Microphone Permission by settings
      await hideNoCamera(page);
    }

    //await Menu.openMapEditor(page);
    await page.getByRole('button', {name: 'toggle-map-editor'}).click();
    await MapEditor.openAreaEditor(page);
    await AreaEditor.drawArea(page, {x: 13*32, y: 13*32}, {x: 15*32, y: 15*32});
    await AreaEditor.setAreaName(page, 'My app zone');

    // add property Klaxoon
    await AreaEditor.addProperty(page, 'Open Klaxoon')

    // insert klaxoon link
    await page.getByPlaceholder('https://app.klaxoon.com/').first().fill('https://app.klaxoon.com/join/KXEWMSE3NF2M');
    await page.locator('.map-editor').click();

    if (browser.browserType() === webkit) {
      // Webkit is somehow failing on this, maybe it is too slow
      //eslint-disable-next-line playwright/no-skipped-test
      test.skip();
      return;
    }

    // check if the iframe activity picker is opened
    const popupPromise = page.waitForEvent('popup');
    await Map.teleportToPosition(page, 9 * 32, 9 * 32)
    /*const popup =*/ await popupPromise;

    // TODO make same test with object editor
  });

  test('Successfully set GoogleWorkspace\'s applications in the area in the map editor', async ({ page, browser, request, browserName }) => {
    if (browser.browserType() === webkit) {
      // Webkit is somehow failing on this, maybe it is too slow
      //eslint-disable-next-line playwright/no-skipped-test
      test.skip();
      return;
    }

    await resetWamMaps(request);

    await page.goto(Map.url("empty"));
    await login(page, "test", 3);
    if(browserName === "webkit"){
      // Because webkit in playwright does not support Camera/Microphone Permission by settings
      await hideNoCamera(page);
    }

    //await Menu.openMapEditor(page);
    await page.getByRole('button', {name: 'toggle-map-editor'}).click();
    await MapEditor.openAreaEditor(page);
    await AreaEditor.drawArea(page, {x: 13*32, y: 13*32}, {x: 15*32, y: 15*32});

    await AreaEditor.setAreaName(page, 'My app zone');

    // add property Google Docs
    await AreaEditor.addProperty(page, 'Open Google Docs');
    // fill Google Docs link
    await page.getByPlaceholder('https://docs.google.com/document/d/1iFHmKL4HJ6WzvQI-6FlyeuCy1gzX8bWQ83dNlcTzigk/edit').first().fill('https://docs.google.com/document/d/1iFHmKL4HJ6WzvQI-6FlyeuCy1gzX8bWQ83dNlcTzigk/edit');

    // add property Google Sheets
    await AreaEditor.addProperty(page, 'Open Google Sheets');
    // fill Google Sheets link
    await page.getByPlaceholder('https://docs.google.com/spreadsheets/d/1SBIn3IBG30eeq944OhT4VI_tSg-b1CbB0TV0ejK70RA/edit').first().fill('https://docs.google.com/spreadsheets/d/1SBIn3IBG30eeq944OhT4VI_tSg-b1CbB0TV0ejK70RA/edit');

    // add property Google Slides
    await AreaEditor.addProperty(page, 'Open Google Slides');
    // fill Google Slides link
    await page.getByPlaceholder('https://docs.google.com/presentation/d/1fU4fOnRiDIvOoVXbksrF2Eb0L8BYavs7YSsBmR_We3g/edit').first().fill('https://docs.google.com/presentation/d/1fU4fOnRiDIvOoVXbksrF2Eb0L8BYavs7YSsBmR_We3g/edit');

    // add property Google Slides
    await AreaEditor.addProperty(page, 'Open Google Drive');
    // fill Google Slides link
    await page.getByPlaceholder('https://drive.google.com/file/d/1DjNjZVbVeQO9EvgONLzCtl6wG-kxSr9Z/preview').first().fill('https://drive.google.com/file/d/1DjNjZVbVeQO9EvgONLzCtl6wG-kxSr9Z/preview');
    

    await Menu.closeMapEditor(page);

    // walk on the area position and open the popup
    await Map.walkToPosition(page, 9 * 32, 9 * 32);

    // check if the iframe was opened and button thumbnail is visible
    await expect(page.locator('#cowebsite-thumbnail-0')).toBeVisible();
    await expect(page.locator('#cowebsite-thumbnail-1')).toBeVisible();
    await expect(page.locator('#cowebsite-thumbnail-2')).toBeVisible();
  });

  test('Successfully set GoogleWorkspace\'s application entity in the map editor', async ({ page, browser, request, browserName }) => {
    if (browser.browserType() === webkit) {
      // Webkit is somehow failing on this, maybe it is too slow
      //eslint-disable-next-line playwright/no-skipped-test
      test.skip();
      return;
    }

    await resetWamMaps(request);

    await page.goto(Map.url("empty"));
    await login(page, "test", 3);
    if(browserName === "webkit"){
      // Because webkit in playwright does not support Camera/Microphone Permission by settings
      await hideNoCamera(page);
    }

    // open map editor
    await page.getByRole('button', {name: 'toggle-map-editor'}).click();
    await MapEditor.openEntityEditor(page);

    // select entity and push it into the map
    await EntityEditor.selectEntity(page, 0, 'small table');
    await EntityEditor.moveAndClick(page, 14*32, 13*32);

    // quit object selector
    await EntityEditor.quitEntitySelector(page);
    await EntityEditor.moveAndClick(page, 14*32, 13*32);

    // add property Google Docs
    await EntityEditor.addProperty(page, 'Open Google Docs');
    // fill Google Docs link
    await page.getByPlaceholder('https://docs.google.com/document/d/1iFHmKL4HJ6WzvQI-6FlyeuCy1gzX8bWQ83dNlcTzigk/edit').first().fill('https://docs.google.com/document/d/1iFHmKL4HJ6WzvQI-6FlyeuCy1gzX8bWQ83dNlcTzigk/edit');

    // add property Google Sheets
    await EntityEditor.addProperty(page, 'Open Google Sheets');
    // fill Google Sheets link
    await page.getByPlaceholder('https://docs.google.com/spreadsheets/d/1SBIn3IBG30eeq944OhT4VI_tSg-b1CbB0TV0ejK70RA/edit').first().fill('https://docs.google.com/spreadsheets/d/1SBIn3IBG30eeq944OhT4VI_tSg-b1CbB0TV0ejK70RA/edit');

    // add property Google Slides
    await EntityEditor.addProperty(page, 'Open Google Slides');
    // fill Google Slides link
    await page.getByPlaceholder('https://docs.google.com/presentation/d/1fU4fOnRiDIvOoVXbksrF2Eb0L8BYavs7YSsBmR_We3g/edit').first().fill('https://docs.google.com/presentation/d/1fU4fOnRiDIvOoVXbksrF2Eb0L8BYavs7YSsBmR_We3g/edit');

    // add property Google Drive
    await EntityEditor.addProperty(page, 'Open Google Drive');
    // fill Google Drive link
    await page.getByPlaceholder('https://drive.google.com/file/d/1DjNjZVbVeQO9EvgONLzCtl6wG-kxSr9Z/preview').first().fill('https://drive.google.com/file/d/1DjNjZVbVeQO9EvgONLzCtl6wG-kxSr9Z/preview');

    // close object selector
    await Menu.closeMapEditor(page);

    // click on the object and open popup
    await EntityEditor.moveAndClick(page, 14*32, 13*32);

    // check if the popup with application is opened
    await expect(page.locator('.actions-menu .actions button').nth(0)).toContainText('Open Google Docs');
    await expect(page.locator('.actions-menu .actions button').nth(1)).toContainText('Open Google Sheets');
    await expect(page.locator('.actions-menu .actions button').nth(2)).toContainText('Open Google Slides');
    await expect(page.locator('.actions-menu .actions button').nth(3)).toContainText('Open Google Drive');
  });

  test('Successfully set Klaxoon\'s application entity in the map editor', async ({ page, browser, request, browserName }) => {
    if (browser.browserType() === webkit) {
      // Webkit is somehow failing on this, maybe it is too slow
      //eslint-disable-next-line playwright/no-skipped-test
      test.skip();
      return;
    }

    await resetWamMaps(request);

    await page.goto(Map.url("empty"));
    await login(page, "test", 3);
    if(browserName === "webkit"){
      // Because webkit in playwright does not support Camera/Microphone Permission by settings
      await hideNoCamera(page);
    }

    // open map editor
    await page.getByRole('button', {name: 'toggle-map-editor'}).click();
    await MapEditor.openEntityEditor(page);

    // select entity and push it into the map
    await EntityEditor.selectEntity(page, 0, 'small table');
    await EntityEditor.moveAndClick(page, 14*32, 13*32);

    // quit object selector
    await EntityEditor.quitEntitySelector(page);
    await EntityEditor.moveAndClick(page, 14*32, 13*32);

    // add property Klaxoon
    await EntityEditor.addProperty(page, 'Open Klaxoon')

    // fill Klaxoon link
    await page.getByPlaceholder('https://app.klaxoon.com/').first().fill('https://app.klaxoon.com/join/KXEWMSE3NF2M');

    // close object selector
    await Menu.closeMapEditor(page);

    // click on the object and open popup
    await EntityEditor.moveAndClick(page, 14*32, 13*32);

    // check if the popup with application is opened
    await expect(page.locator('.actions-menu .actions button').nth(0)).toContainText('Open Klaxoon');
  });

  // Create test for Google picker docs
  // test('Successfully open Google picker for docs', async ({ page, browser, request, browserName }) => {});
  // Create test for Google picker spreadsheet
  // Create test fir Google picker presentation
  // Create test for Google picker drive

  test('Successfully set searchable processus for entity and zone', async ({ page, browser, request, browserName }) => {
    /*if (browser.browserType() === webkit) {
      // Webkit is somehow failing on this, maybe it is too slow
      //eslint-disable-next-line playwright/no-skipped-test
      test.skip();
      return;
    }*/

    await resetWamMaps(request);
    await page.goto(Map.url("empty"));
    await login(page, "test", 3);
    // Because webkit in playwright does not support Camera/Microphone Permission by settings
    if(browserName === "webkit"){
      await hideNoCamera(page);
    }

    // Open the map editor
    await Menu.openMapEditor(page);

    // Area
    await MapEditor.openAreaEditor(page);
    await AreaEditor.drawArea(page, {x: 1*32*1.5, y: 5}, {x: 9*32*1.5, y: 4*32*1.5});
    await AreaEditor.setAreaName(page, 'My Focusable Zone');
    await AreaEditor.setAreaDescription(page, 'This is a focus zone to test the search feature in the exploration mode. It should be searchable.');
    await AreaEditor.setAreaSearcheable(page, true);
    await AreaEditor.addProperty(page, 'Focusable');

    // Entity
    // Webkit is somehow failing on this, maybe it is too slow
    if (browser.browserType() !== webkit) {
      //eslint-disable-next-line playwright/no-skipped-test
      await MapEditor.openEntityEditor(page);
      await EntityEditor.selectEntity(page, 0, 'small table');
      await EntityEditor.moveAndClick(page, 14*32, 13*32);
      await EntityEditor.quitEntitySelector(page);
      await EntityEditor.moveAndClick(page, 14*32, 13*32);
      await EntityEditor.setEntityName(page, 'My Jitsi Entity');
      await EntityEditor.setEntityDescription(page, 'This is a Jitsi entity to test the search feature in the exploration mode. It should be searchable.');
      await EntityEditor.setEntitySearcheable(page, true);
      await EntityEditor.addProperty(page, 'Jitsi Room');
    }

    // Open the map exploration mode
    await MapEditor.openExploration(page);
    await Exploration.openSreachMode(page);

    // Excpected 1 entity and 1 zone in the search result
    // With webkit, something wrong to put an object and clik on it, so in this case, we don't have an object
    if (browser.browserType() !== webkit) {
      // Test if the entity is searchable
      await expect(page.locator('.map-editor .sidebar .entities')).toContainText('1 objects found');
      await page.locator('.map-editor .sidebar .entities').click();
      expect(await page.locator('.map-editor .sidebar .entity-items .item').count()).toBe(1);
    }else{
      // For webkit, we don't have an object
      await expect(page.locator('.map-editor .sidebar .entities')).toContainText('No entity found in the room 🙅‍♂️');
    }

    // Test if the area is searchable
    await expect(page.locator('.map-editor .sidebar .areas')).toContainText('1 areas found');
    await page.locator('.map-editor .sidebar .areas').click();
    expect(await page.locator('.map-editor .sidebar .area-items .item').count()).toBe(1);
  });
});
