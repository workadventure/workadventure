import {Page} from "@playwright/test";

class Map {
    async walkTo(page: Page, key: string, delay = 0){
        await page.keyboard.press(key, {delay});
    }

    async walkToPosition(page: Page, x: number, y: number, delay = 0){
        await page.mouse.click(x, y, {delay, button: 'right'});
    }
}

export default new Map();
