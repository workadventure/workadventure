import {Page} from "@playwright/test";

class Map {
    async walkTo(page: Page, key: string, delay = 0){
        await page.keyboard.press(key, {delay});
    }
}

export default new Map();
