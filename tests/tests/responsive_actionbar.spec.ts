import {expect, test} from '@playwright/test';
import {evaluateScript} from "./utils/scripting";
import {publicTestMapUrl} from "./utils/urls";
import { getPage } from './utils/auth';
import {isMobile} from "./utils/isMobile";
import Menu from "./utils/menu";

test.describe('Action bar responsiveness @nomobile', () => {
    test.beforeEach(async ({ page }) => {
        test.skip(isMobile(page), 'Skip on mobile devices');
    });
    test('Check items in the action bar go in the menu one by one @oidc', async ({ browser }) => {
        
        await using page = await getPage(browser, 'Alice',
            publicTestMapUrl("tests/E2E/empty.json", "responsive_actionbar")
        );
        // Use script to add new button
        await evaluateScript(page, async () => {
            WA.ui.actionBar.addButton({
                id: 'register-btn',
                label: 'Register',
                bgColor: '#4056F6',
                callback: () => {
                    WA.ui.actionBar.removeButton('register-btn');
                }
            });
            WA.ui.actionBar.addButton({
                id: 'download-btn',
                isGradient: true,
                label: 'Download',
                bgColor: '#eab127',

                callback: () => {
                    WA.ui.actionBar.removeButton('download-btn');
                }
            });
            WA.ui.actionBar.addButton({
                id: 'inventory-btn',
                label: 'Inventory',
                callback: () => {
                    WA.ui.actionBar.removeButton('inventory-btn');
                }
            });
        });

        await expect(page.getByText('Register')).toBeVisible();
        await expect(page.getByText('Download')).toBeVisible();
        await expect(page.getByText('Inventory')).toBeVisible();

        await page.setViewportSize({ width: 750, height: 600 });

        await expect(page.getByText('Register')).toBeHidden();
        await expect(page.getByText('Download')).toBeHidden();
        await expect(page.getByText('Inventory')).toBeVisible();

        await Menu.openMenu(page);

        await expect(page.getByTestId('profile-menu').getByText('Register')).toBeVisible();
        await expect(page.getByTestId('profile-menu').getByText('Download')).toBeVisible();

        await Menu.closeMenu(page);


        await expect(page.getByText('Share')).toBeVisible();
        await expect(page.getByText('Login')).toBeVisible();

        await page.setViewportSize({ width: 345, height: 600 });

        await expect(page.getByText('Share')).toBeHidden();
        await expect(page.getByText('Login')).toBeHidden();

        await Menu.openMenu(page);

        await expect(page.getByTestId('profile-menu').getByText('Share')).toBeVisible();
        await expect(page.getByTestId('profile-menu').getByText('Login')).toBeVisible();



        await page.context().close();
    });
});
