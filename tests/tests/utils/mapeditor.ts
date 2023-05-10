import {Page} from "@playwright/test";
import {expectInViewport} from "./viewport";

class MapEditor {
    async openConfigureMyRoom(page: Page) {
        await page.getByRole('button', {name: 'open tool ConfigureMyRoom'}).first().click();
        await expectInViewport('.map-editor .configure-my-room', page);
    }
}

export default new MapEditor();