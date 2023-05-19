import {Page} from "@playwright/test";
import {expectInViewport} from "./viewport";

class MapEditor {
    async openConfigureMyRoom(page: Page) {
        await page.locator('section.side-bar-container .side-bar .tool-button').last().locator('button').click();
        await expectInViewport('.map-editor .configure-my-room', page);
    }
}

export default new MapEditor();