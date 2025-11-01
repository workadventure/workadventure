import {expect, test} from '@playwright/test';
import {evaluateScript} from "./utils/scripting";
import {publicTestMapUrl} from "./utils/urls";
import { getPage } from './utils/auth';
import {isMobile} from "./utils/isMobile";
import Menu from "./utils/menu";

test.describe('action bar @nomobile', () => {
    test.beforeEach(async ({ page }) => {
        test.skip(isMobile(page), 'Skip on mobile devices');
    });
    test('Buttons in action bar and sub-menus', async ({ browser }) => {
        
        await using page = await getPage(browser, 'Alice',
            publicTestMapUrl("tests/E2E/empty.json", "buttonactionbar_script")
        );
        // Use script to add new button
        await evaluateScript(page, async () => {
            WA.ui.actionBar.addButton({
                id: 'register-btn',
                label: 'Register',
                callback: () => {
                    WA.ui.actionBar.removeButton('register-btn');
                }
            });

            WA.ui.actionBar.addButton({
                id: 'custom-apps-btn',
                label: 'Custom apps button',
                callback: () => {
                    WA.ui.actionBar.removeButton('custom-apps-btn');
                },
                location: 'appsMenu',
            });

            WA.ui.actionBar.addButton({
                id: 'custom-build-btn',
                label: 'Custom build button',
                callback: () => {
                    WA.ui.actionBar.removeButton('custom-build-btn');
                },
                location: 'buildMenu',
            });

            WA.ui.actionBar.addButton({
                id: 'custom-profile-btn',
                label: 'Custom profile button',
                callback: () => {
                    WA.ui.actionBar.removeButton('custom-profile-btn');
                },
                location: 'profileMenu',
            });
        });
        // Click on the register button
        await page.getByText('Register').click();
        // Check if the register button is hidden
        await expect(page.getByText('Register')).toHaveCount(0);

        await page.getByTestId('apps-button').click();
        await expect(page.getByRole('button', { name: 'Custom apps button' })).toBeVisible();
        await page.getByRole('button', { name: 'Custom apps button' }).click();
        await expect(page.getByRole('button', { name: 'Custom apps button' })).toBeHidden();

        await Menu.openMenu(page);
        await expect(page.getByRole('button', { name: 'Custom profile button' })).toBeVisible();
        await page.getByRole('button', { name: 'Custom profile button' }).click();
        await expect(page.getByRole('button', { name: 'Custom profile button' })).toBeHidden();

        await page.getByTestId('map-menu').click();
        await expect(page.getByRole('button', { name: 'Custom build button' })).toBeVisible();
        await page.getByRole('button', { name: 'Custom build button' }).click();
        await expect(page.getByRole('button', { name: 'Custom build button' })).toBeHidden();

        await page.context().close();
    });

    test('Action button in action bar', async ({ browser }) => {
        await using page = await getPage(browser, 'Alice', 
            publicTestMapUrl("tests/E2E/empty.json", "buttonactionbar_script")
        );
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
         **/
        // Click on the register button
        await page.getByRole('button', { name: 'Register' }).click();
        // Check if the register button is hidden
        await expect(page.getByRole('button', { name: 'Register' })).toHaveCount(0);

        await page.context().close();
    });
});
