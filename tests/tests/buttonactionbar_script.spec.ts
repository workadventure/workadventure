import {expect, test} from '@playwright/test';
import { login } from './utils/roles';
import {evaluateScript} from "./utils/scripting";
import {RENDERER_MODE} from "./utils/environment";

test.describe('Button in action bar', () => {
    test('test', async ({ page }) => {
        // Go to WorkAdventure platform
        await page.goto(
            `http://play.workadventure.localhost/_/global/maps.workadventure.localhost/tests/E2E/empty.json?phaserMode=${RENDERER_MODE}`
        );

        // Login Alice
        await login(page, "Alice");

        // Use script to add new button
        await evaluateScript(page, async () => {
            return WA.ui.actionBar.addButton({
                id: 'register-btn',
                label: 'Register',
                callback: () => {
                    WA.ui.actionBar.removeButton('register-btn');
                }
            });
        });

        // Click on the register button
        await page.getByText('Register').click();

        // Check if the register button is hidden
        await expect(page.getByText('Register')).toHaveCount(0);
    });
});

test.describe('Action button in action bar', () => {
    test('test', async ({ page }) => {
        // Go to WorkAdventure platform
        await page.goto(
            `http://play.workadventure.localhost/_/global/maps.workadventure.localhost/tests/E2E/empty.json?phaserMode=${RENDERER_MODE}`
        );

        // Login Alice
        await login(page, "Alice");

        // Use script to add new button
        await evaluateScript(page, async () => {
            return WA.ui.actionBar.addButton({
                id: 'register-btn',
                type: 'action',
                toolTip: 'Register',
                imageSrc: '/src/front/Components/images/icon-workadventure-white.png',
                callback: () => {
                    WA.ui.actionBar.removeButton('register-btn');
                }
            });
        });

        /**
         *  TODO apply this when API scripting will released
         */
        // Click on the register button
        await page.locator('#register-btn').click();

        // Check if the register button is hidden
        await expect(page.locator('#register-btn')).toHaveCount(0);
    });
});
