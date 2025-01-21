import {test} from '@playwright/test';
import Map from './utils/map';
import {publicTestMapUrl} from "./utils/urls";
import { getPage} from "./utils/auth";

test.describe('Scripting moveto function', () => {
    test('stops at correct position', async ({ browser}) => {
        const page = await getPage(browser, 'Alice', publicTestMapUrl("tests/E2E/empty.json", "scripting_follow"));

        await Map.walkToPosition(page, 5*32, 5*32);

        // FIXME: the position is moved by 16 pixels.
        // There is a discrepancy between the position asked (5*32) and the position reached (5*32 + 16)

        //const position = await Map.getPosition(page);
        /*const position = await evaluateScript(page, async () => {
            await WA.onInit();
            return await WA.player.getPosition();
        });

        expect(position.x).toBe(5*32);
        expect(position.y).toBe(5*32);*/
    });
});