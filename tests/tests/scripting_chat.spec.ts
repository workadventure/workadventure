import {expect, Frame, Page, test} from '@playwright/test';
import { login } from './utils/roles';
import {evaluateScript, getScriptFrame} from "./utils/scripting";

test.describe('Scripting chat functions', () => {
    test('can open / close chat', async ({ page}) => {
        await page.goto(
            'http://play.workadventure.localhost/_/global/maps.workadventure.localhost/tests/E2E/empty.json'
        );

        await login(page);

        const chatWindow = page.locator("aside.chatWindow");

        await expect(chatWindow).not.toBeVisible();

        await evaluateScript(page, async () => {
            return WA.chat.open();
        });

        await expect(chatWindow).toBeVisible();

        await evaluateScript(page, async () => {
            return WA.chat.close();
        });

        await expect(chatWindow).not.toBeVisible();
    });
});
