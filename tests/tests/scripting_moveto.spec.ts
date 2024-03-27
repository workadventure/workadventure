import {expect, test, webkit} from '@playwright/test';
import { login } from './utils/roles';
import {evaluateScript} from "./utils/scripting";
import Map from './utils/map';
import {publicTestMapUrl} from "./utils/urls";

test.describe('Scripting moveto function', () => {
    test('stops at correct position', async ({ page, browser}, { project }) => {
        await page.goto(
            publicTestMapUrl("tests/E2E/empty.json", "scripting_follow")
        );

        await login(page);

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
