import {Page} from "@playwright/test";
import {expectInViewport} from "./viewport";

class MapEditor {
    async openConfigureMyRoom(page: Page) {
        await page.locator('section.side-bar-container .side-bar .tool-button button#WAMSettingsEditor').click();
        await expectInViewport('.map-editor .configure-my-room', page);
    }

    async openAreaEditor(page: Page) {
        await page.locator('section.side-bar-container .side-bar .tool-button button#AreaEditor').click();
    }
}

export default new MapEditor();