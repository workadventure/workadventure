import {test} from '@playwright/test';
import { login } from './utils/roles';
import {evaluateScript} from "./utils/scripting";
import {expectInViewport, expectOutViewport} from "./utils/viewport";

test.describe('Scripting chat functions', () => {
    test('can open / close chat', async ({ page}) => {
        await page.goto(
            'http://play.workadventure.localhost/_/global/maps.workadventure.localhost/tests/E2E/empty.json'
        );

        await login(page);

        await expectOutViewport("#chatWindow", page);

        await evaluateScript(page, async () => {
            return WA.chat.open();
        });

        await expectInViewport("#chatWindow", page);

        await evaluateScript(page, async () => {
            return WA.chat.close();
        });

        await expectOutViewport("#chatWindow", page);
    });
});
