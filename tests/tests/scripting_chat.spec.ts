import {expect, test} from '@playwright/test';
import { login } from './utils/roles';
import {evaluateScript} from "./utils/scripting";
import {inViewport, outViewport} from "./utils/viewport";

test.describe('Scripting chat functions', () => {
    test('can open / close chat', async ({ page}) => {
        await page.goto(
            'http://play.workadventure.localhost/_/global/maps.workadventure.localhost/tests/E2E/empty.json'
        );

        await login(page);

        await expect(await outViewport("#chatWindow", page)).toBeFalsy();

        await evaluateScript(page, async () => {
            return WA.chat.open();
        });

        await expect(await inViewport("#chatWindow", page)).toBeTruthy();

        await evaluateScript(page, async () => {
            return WA.chat.close();
        });

        await expect(await outViewport("#chatWindow", page)).toBeFalsy();
    });
});
