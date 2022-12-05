import { test } from '@playwright/test';
import { login } from './utils/roles';
import {evaluateScript} from "./utils/scripting";

test.describe('Button action bar', () => {
    test('test', async ({ page }) => {
        // Go to WorkAdventure platform
        await page.goto(
            'http://play.workadventure.localhost/_/global/maps.workadventure.localhost/tests/E2E/empty.json'
        );

        // Login Alice
        await login(page, "Alice");

        // Use script to add new button
        await evaluateScript(page, async () => {
            return WA.ui.actionBar.addButtonActionBar('register-btn', 'Regsiter', () => {
                WA.ui.actionBar.removeButtonActionBar('register-btn');
            });
        });

        // Click on the register button
        await page.locator("#register-btn").click();

        // Check if the register button is hidden
        await page.locator("#register-btn").isHidden();
    });
});