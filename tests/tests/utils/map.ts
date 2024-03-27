import {Page} from "@playwright/test";
import {evaluateScript} from "./scripting";
import { RENDERER_MODE } from "./environment";
import {play_url} from "./urls";

class Map {
    async walkTo(page: Page, key: string, delay = 0){
        await page.keyboard.press(key, {delay});
    }

    async rightClickToPosition(page: Page, x: number, y: number, delay = 0){
        await page.mouse.click(x, y, {delay, button: 'right'});
    }

    async walkToPosition(page: Page, x: number, y: number){
        await evaluateScript(page, async ({x, y}) => {
            await WA.player.moveTo(x, y, 3);
            return;
        }, {
            x,
            y,
        });
    }

    async teleportToPosition(page: Page, x: number, y: number){
        await evaluateScript(page, async ({x, y}) => {
            await WA.player.teleport(x, y);
            return;
        }, {
            x,
            y,
        });
    }

    async goToRoom(page: Page, room: string){
        await evaluateScript(page, async ({ room }) => {
            WA.nav.goToRoom(room);
        }, {
            room,
        });
    }

    async getPosition(page: Page){
        return await evaluateScript(page, async () => {
            await WA.onInit();
            return await WA.player.getPosition();
        });
    }

    url(end: string){
        return `${play_url}/~/maps/${end}.wam?phaserMode=${RENDERER_MODE}`;
    }
}

export default new Map();
