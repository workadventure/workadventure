import { expect, test } from '@playwright/test';
import * as Menu from "./utils/menu";
import {login} from "./utils/roles";
import * as MapEditor from "./utils/mapeditor";
import * as ConfigureMyRoom from "./utils/map-editor/configureMyRoom";

test.describe('Map editor', () => {
  test('Successfully set the megaphone feature', async ({ page }) => {
    await page.goto('http://play.workadventure.localhost/~/maps/areas.wam');
    await login(page, "test", 3);

    await Menu.openMapEditor(page);

    await MapEditor.openConfigureMyRoom(page);
    await ConfigureMyRoom.selectMegaphoneItemInCMR(page);

    await ConfigureMyRoom.toggleMegaphone(page);
    await ConfigureMyRoom.isMegaphoneEnabled(page);
    await ConfigureMyRoom.megaphoneInputNameSpace(page);
    await ConfigureMyRoom.megaphoneSelectScope(page);
    await ConfigureMyRoom.megaphoneAddNewRights(page);
    await ConfigureMyRoom.megaphoneSave(page);

    await expect(await page.locator('.map-editor .modal .content button:disabled')).toContainText('Successfully saved');

    await page.reload();

    await Menu.openMapEditor(page);
    await MapEditor.openConfigureMyRoom(page);
    await ConfigureMyRoom.selectMegaphoneItemInCMR(page);
    await ConfigureMyRoom.isMegaphoneEnabled(page);

    // TODO : Add test if in menu bar there is the megaphone icon
    // TODO : Add test if tag are correctly filtered
    // TODO : Add test if sound is correctly played
    // TODO : Add test is conference is correctly opened
    // TODO : Add test if the megaphone is correctly displayed in the map of other users
  });
});
